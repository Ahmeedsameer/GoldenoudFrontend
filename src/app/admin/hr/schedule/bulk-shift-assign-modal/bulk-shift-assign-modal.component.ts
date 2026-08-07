import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { HrService } from '../../../../services/hr.service';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { DatePickerComponent } from '../../../../shared/components/form/date-picker/date-picker.component';

interface AssignableEmployee {
  id: number;
  name: string;
  role: string;
  shop_id: number | null;
  primary_branch: string | null;
}

/**
 * Bulk Shift Assignment — additive feature on top of the existing weekly
 * Schedule grid. Assigns ONE shift template to MANY employees on ONE date
 * via the dedicated `POST /hr/schedule/bulk-assign` endpoint (see
 * HrService.bulkAssignShift()) — a single request, never one per employee.
 *
 * Deliberately a SEPARATE component/flow from the grid's existing per-cell
 * editor (`onCellClick`/`saveCellLocally`/`saveWeek` in HrScheduleComponent)
 * — nothing here touches that code path, so the existing single-employee
 * assignment keeps behaving exactly as before.
 */
@Component({
  selector: 'app-bulk-shift-assign-modal',
  imports: [CommonModule, FormsModule, ModalComponent, DatePickerComponent],
  templateUrl: './bulk-shift-assign-modal.component.html',
})
export class BulkShiftAssignModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() shops: { id: number; name: string }[] = [];
  @Input() shiftTemplates: { id: number; name: string; start_time: string; end_time: string }[] = [];
  @Output() close = new EventEmitter<void>();
  /** Fired after a successful assignment so the parent grid can reload. */
  @Output() assigned = new EventEmitter<void>();

  private hr = inject(HrService);

  step: 'select' | 'confirm' = 'select';

  filters: { shop_id: number | null; role: string; search: string } = { shop_id: null, role: '', search: '' };
  private search$ = new Subject<string>();

  employees: AssignableEmployee[] = [];
  loadingEmployees = false;
  selectedIds = new Set<number>();

  shiftId: number | null = null;
  date = this.iso(new Date());

  conflicts: { user_id: number; name: string; type: string; shift_name: string | null }[] = [];
  loadingConflicts = false;
  replaceExisting = false;

  submitting = false;
  errorMessage = '';

  constructor() {
    this.search$.pipe(debounceTime(300)).subscribe(() => this.loadEmployees());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetState();
    }
  }

  private iso(d: Date): string {
    return d.toISOString().substring(0, 10);
  }

  private resetState(): void {
    this.step = 'select';
    this.filters = { shop_id: null, role: '', search: '' };
    this.employees = [];
    this.selectedIds = new Set<number>();
    this.shiftId = null;
    this.date = this.iso(new Date());
    this.conflicts = [];
    this.replaceExisting = false;
    this.errorMessage = '';
  }

  // ── Branch / employee filters — combinable, per spec ─────────────────────
  onShopChange(): void {
    this.loadEmployees();
  }

  onRoleChange(): void {
    this.loadEmployees();
  }

  onSearchInput(value: string): void {
    this.filters.search = value;
    this.search$.next(value);
  }

  private loadEmployees(): void {
    // Branch must be picked first — no employee list before that (per spec).
    if (!this.filters.shop_id) {
      this.employees = [];
      return;
    }
    this.loadingEmployees = true;
    this.hr.getAssignableEmployees({
      shop_id: this.filters.shop_id,
      role: this.filters.role || undefined,
      search: this.filters.search || undefined,
    }).subscribe({
      next: (rows) => { this.employees = rows || []; this.loadingEmployees = false; },
      error: () => { this.employees = []; this.loadingEmployees = false; },
    });
  }

  // ── Selection ──────────────────────────────────────────────────────────
  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  toggle(id: number): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  /** Selects/deselects only the CURRENTLY FILTERED/visible employees — never
   *  employees hidden by the active filters, per spec. */
  get allFilteredSelected(): boolean {
    return this.employees.length > 0 && this.employees.every((e) => this.selectedIds.has(e.id));
  }

  toggleSelectAllFiltered(): void {
    if (this.allFilteredSelected) {
      this.employees.forEach((e) => this.selectedIds.delete(e.id));
    } else {
      this.employees.forEach((e) => this.selectedIds.add(e.id));
    }
  }

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  get selectedShop(): { id: number; name: string } | undefined {
    return this.shops.find((s) => s.id === this.filters.shop_id);
  }

  get selectedShift(): { id: number; name: string } | undefined {
    return this.shiftTemplates.find((s) => s.id === this.shiftId);
  }

  get canProceed(): boolean {
    return this.selectedCount > 0 && !!this.shiftId && !!this.date;
  }

  // ── Step 2: conflict check + confirmation ─────────────────────────────
  proceedToConfirm(): void {
    if (!this.canProceed) return;
    this.errorMessage = '';
    this.loadingConflicts = true;
    const ids = Array.from(this.selectedIds);
    this.hr.getBulkAssignConflicts(ids, this.date).subscribe({
      next: (res) => {
        this.conflicts = res?.conflicts ?? [];
        this.replaceExisting = false; // default = skip existing, per spec
        this.loadingConflicts = false;
        this.step = 'confirm';
      },
      error: (err) => {
        this.loadingConflicts = false;
        this.errorMessage = err?.error?.message || 'تعذّر التحقق من الجداول الحالية.';
      },
    });
  }

  backToSelect(): void {
    this.step = 'select';
  }

  confirmAndSubmit(): void {
    if (!this.shiftId || this.submitting) return;
    this.submitting = true;
    this.errorMessage = '';
    this.hr.bulkAssignShift({
      employee_ids: Array.from(this.selectedIds),
      shift_id: this.shiftId,
      date: this.date,
      replace_existing: this.replaceExisting,
    }).subscribe({
      next: (res) => {
        this.submitting = false;
        alert(res.message);
        this.assigned.emit();
        this.closeModal();
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.error?.message || 'تعذّر تنفيذ التعيين الجماعي.';
      },
    });
  }

  closeModal(): void {
    this.close.emit();
  }
}
