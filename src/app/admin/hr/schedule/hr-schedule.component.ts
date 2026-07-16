import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HrService } from '../../../services/hr.service';
import { ShopService } from '../../../services/shop.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';

interface Cell {
  date: string;
  type: string | null;
  editable: boolean;
  shift?: { id: number; name: string; color: string; start_time: string; end_time: string } | null;
  start_time?: string | null;
  end_time?: string | null;
  branch_name?: string | null;
  notes?: string | null;
  is_published?: boolean;
  transfer?: { id: number; branch_name: string | null; start_date: string; end_date: string };
}

interface EmployeeRow {
  user_id: number;
  name: string;
  role: string;
  primary_branch: string | null;
  status: string;
  cells: Cell[];
}

/** Cell-type visual language (Phase 9 palette) — kept in one place so colors stay consistent app-wide. */
const CELL_META: Record<string, { label: string; dot: string; soft: string }> = {
  work:          { label: 'عمل',           dot: 'bg-success-500', soft: 'bg-success-50 border-success-200 text-success-700 dark:bg-success-500/10 dark:border-success-500/30 dark:text-success-400' },
  leave:         { label: 'إجازة',         dot: 'bg-blue-500',    soft: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400' },
  off_day:       { label: 'يوم إجازة أسبوعية', dot: 'bg-gray-400', soft: 'bg-gray-100 border-gray-200 text-gray-600 dark:bg-white/[0.05] dark:border-gray-700 dark:text-gray-400' },
  holiday:       { label: 'عطلة رسمية',    dot: 'bg-teal-500',    soft: 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-500/10 dark:border-teal-500/30 dark:text-teal-400' },
  transferred:   { label: 'منقول مؤقتًا',  dot: 'bg-indigo-500',  soft: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400' },
  training:      { label: 'تدريب',         dot: 'bg-orange-500',  soft: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400' },
  sick_leave:    { label: 'إجازة مرضية',   dot: 'bg-rose-500',    soft: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400' },
  business_trip: { label: 'مهمة عمل',      dot: 'bg-purple-500',  soft: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-400' },
  absent:        { label: 'غياب',          dot: 'bg-error-500',   soft: 'bg-error-50 border-error-200 text-error-600 dark:bg-error-500/10 dark:border-error-500/30 dark:text-error-400' },
  late:          { label: 'تأخير',         dot: 'bg-yellow-500',  soft: 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-500/10 dark:border-yellow-500/30 dark:text-yellow-400' },
  half_day:      { label: 'نصف يوم',       dot: 'bg-amber-500',   soft: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400' },
};

const WEEKDAY_NAMES = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

@Component({
  selector: 'app-hr-schedule',
  imports: [CommonModule, FormsModule, LoadingComponent, ModalComponent, DatePickerComponent],
  templateUrl: './hr-schedule.component.html',
})
export class HrScheduleComponent implements OnInit {
  private hr = inject(HrService);
  private shopService = inject(ShopService);
  private router = inject(Router);

  loading = false;
  saving = false;
  publishing = false;
  exporting = false;

  anchorDate = this.iso(new Date());
  roster: { from: string; to: string; days: string[]; employees: EmployeeRow[] } | null = null;

  /** Pending unsaved cell edits, keyed by "userId_date" — a single bulk request saves all of them. */
  pendingEdits: Record<string, { user_id: number; date: string; type: string; shift_template_id: number | null; start_time: string | null; end_time: string | null; shop_id: number | null; notes: string | null }> = {};
  get pendingCount(): number { return Object.keys(this.pendingEdits).length; }

  shops: { id: number; name: string }[] = [];
  shiftTemplates: { id: number; name: string; color: string; start_time: string; end_time: string; description?: string }[] = [];

  filters: { shop_id: string | number; role: string; user_id: string | number; status: string } = {
    shop_id: '', role: '', user_id: '', status: '',
  };

  cellMeta = CELL_META;
  weekdayNames = WEEKDAY_NAMES;
  typeOptions = [
    { value: 'work', label: 'عمل' },
    { value: 'leave', label: 'إجازة' },
    { value: 'off_day', label: 'يوم إجازة أسبوعية' },
    { value: 'holiday', label: 'عطلة رسمية' },
    { value: 'training', label: 'تدريب' },
    { value: 'business_trip', label: 'مهمة عمل' },
    { value: 'sick_leave', label: 'إجازة مرضية' },
    { value: 'absent', label: 'غياب' },
    { value: 'late', label: 'تأخير' },
    { value: 'half_day', label: 'نصف يوم' },
  ];

  // ── Cell editor modal ──────────────────────────
  showEditor = false;
  editorEmployee: EmployeeRow | null = null;
  editorCell: Cell | null = null;
  editorForm: { type: string; shift_template_id: number | null; start_time: string; end_time: string; shop_id: number | null; notes: string } = {
    type: 'work', shift_template_id: null, start_time: '', end_time: '', shop_id: null, notes: '',
  };

  // ── Transfer info panel (read-only) ────────────
  showTransferInfo = false;
  transferInfoCell: Cell | null = null;
  transferInfoEmployee: EmployeeRow | null = null;

  // ── Shift template management (admin) ──────────
  showShiftAdmin = false;
  shiftForm = { name: '', color: 'blue', start_time: '', end_time: '', description: '' };
  shiftSaving = false;
  colorOptions = ['blue', 'success', 'orange', 'purple', 'teal', 'rose', 'indigo', 'gray'];

  manageTemplates: { id: number; name: string; color: string; description: string | null; start_time: string; end_time: string; is_active: boolean; used_in_future: boolean }[] = [];
  editingTemplateId: number | null = null;
  templateEditForm = { name: '', color: 'blue', start_time: '', end_time: '', description: '' };
  templateBusyId: number | null = null;

  // Edit-propagation-scope confirmation dialog
  showScopeDialog = false;
  scopeChoice: 'future' | 'unpublished' | 'all' = 'future';
  private pendingTemplateEditId: number | null = null;
  private pendingTemplateEditPayload: any = null;

  ngOnInit(): void {
    this.shopService.getShops({ page: -1 }).subscribe({ next: (r) => this.shops = r.data?.data || r.data || r || [], error: () => {} });
    this.loadShiftTemplates();
    this.load();
  }

  private loadShiftTemplates() {
    this.hr.getShiftTemplates().subscribe({ next: (t) => this.shiftTemplates = t || [], error: () => {} });
  }

  private iso(d: Date): string { return d.toISOString().substring(0, 10); }

  load() {
    this.loading = true;
    this.pendingEdits = {};
    const params: any = { date: this.anchorDate };
    if (this.filters.shop_id) params.shop_id = this.filters.shop_id;
    if (this.filters.role) params.role = this.filters.role;
    if (this.filters.user_id) params.user_id = this.filters.user_id;
    if (this.filters.status) params.status = this.filters.status;

    this.hr.getScheduleRoster(params).subscribe({
      next: (r) => { this.roster = r; this.loading = false; },
      error: () => { this.roster = null; this.loading = false; },
    });
  }

  // ── Week navigation ─────────────────────────────
  prevWeek() { this.shiftWeek(-7); }
  nextWeek() { this.shiftWeek(7); }
  private shiftWeek(days: number) {
    if (this.pendingCount && !confirm('لديك تعديلات غير محفوظة — سيتم فقدانها. متابعة؟')) return;
    const d = new Date(this.anchorDate);
    d.setDate(d.getDate() + days);
    this.anchorDate = this.iso(d);
    this.load();
  }
  onDatePicked(v: string) { this.anchorDate = v; this.load(); }

  dayLabel(i: number): string { return this.weekdayNames[i] ?? ''; }

  allEmployees(): { user_id: number; name: string }[] {
    return (this.roster?.employees ?? []).map((e) => ({ user_id: e.user_id, name: e.name }));
  }

  /** Effective cell = pending local edit if present, else the server value. */
  effectiveCell(emp: EmployeeRow, cell: Cell): Cell {
    const key = `${emp.user_id}_${cell.date}`;
    const pending = this.pendingEdits[key];
    if (!pending) return cell;
    return {
      ...cell,
      type: pending.type,
      shift: pending.shift_template_id ? this.shiftTemplates.find((s) => s.id === pending.shift_template_id) as any : null,
      start_time: pending.start_time,
      end_time: pending.end_time,
      notes: pending.notes,
    };
  }

  isPending(emp: EmployeeRow, cell: Cell): boolean {
    return !!this.pendingEdits[`${emp.user_id}_${cell.date}`];
  }

  // ── Cell click routing ──────────────────────────
  onCellClick(emp: EmployeeRow, cell: Cell) {
    if (cell.type === 'transferred') {
      this.transferInfoEmployee = emp;
      this.transferInfoCell = cell;
      this.showTransferInfo = true;
      return;
    }
    const eff = this.effectiveCell(emp, cell);
    this.editorEmployee = emp;
    this.editorCell = cell;
    this.editorForm = {
      type: eff.type ?? 'work',
      shift_template_id: eff.shift?.id ?? null,
      start_time: eff.start_time ?? '',
      end_time: eff.end_time ?? '',
      shop_id: null,
      notes: eff.notes ?? '',
    };
    this.showEditor = true;
  }

  /** Selecting a template is an optional shortcut that prefills manual times — still editable after. */
  onShiftTemplateChange() {
    const tpl = this.shiftTemplates.find((s) => s.id === this.editorForm.shift_template_id);
    if (tpl) {
      this.editorForm.start_time = tpl.start_time;
      this.editorForm.end_time = tpl.end_time;
    }
  }

  /** Stage the cell edit locally — no network call yet (bulk-saved together). */
  saveCellLocally() {
    if (!this.editorEmployee || !this.editorCell) return;
    const key = `${this.editorEmployee.user_id}_${this.editorCell.date}`;
    this.pendingEdits[key] = {
      user_id: this.editorEmployee.user_id,
      date: this.editorCell.date,
      type: this.editorForm.type,
      shift_template_id: this.editorForm.shift_template_id,
      start_time: this.editorForm.start_time || null,
      end_time: this.editorForm.end_time || null,
      shop_id: this.editorForm.shop_id,
      notes: this.editorForm.notes || null,
    };
    this.showEditor = false;
  }

  /** Bulk-save every pending edit for the week in a SINGLE request. */
  saveWeek() {
    const entries = Object.values(this.pendingEdits);
    if (!entries.length) return;
    this.saving = true;
    this.hr.bulkSaveSchedule(entries).subscribe({
      next: (res) => {
        this.saving = false;
        this.pendingEdits = {};
        alert(res.message);
        this.load();
      },
      error: (err) => { this.saving = false; alert(err?.error?.message || 'تعذّر الحفظ'); },
    });
  }

  goToTransfer() {
    // The transfer record itself lives on the Transfers page (single source of
    // truth) — we route there rather than duplicating its edit UI here.
    this.router.navigate(['/dashboard/hr/transfers']);
  }

  publish() {
    if (this.pendingCount) { alert('احفظ التعديلات أولاً قبل النشر.'); return; }
    if (!confirm(`نشر جدول الأسبوع ${this.roster?.from} → ${this.roster?.to}؟ سيتم إشعار الموظفين المتأثرين.`)) return;
    this.publishing = true;
    const params: any = { date: this.anchorDate };
    if (this.filters.shop_id) params.shop_id = this.filters.shop_id;
    if (this.filters.user_id) params.user_id = this.filters.user_id;
    this.hr.publishSchedule(params).subscribe({
      next: (res) => { this.publishing = false; alert(res.message); this.load(); },
      error: (e) => { this.publishing = false; alert(e?.error?.message || 'تعذّر النشر'); },
    });
  }

  cancelPublish() {
    if (!confirm('إلغاء نشر جدول هذا الأسبوع؟ سيتم إشعار الموظفين المتأثرين.')) return;
    this.publishing = true;
    const params: any = { date: this.anchorDate };
    if (this.filters.shop_id) params.shop_id = this.filters.shop_id;
    if (this.filters.user_id) params.user_id = this.filters.user_id;
    this.hr.cancelSchedule(params).subscribe({
      next: (res) => { this.publishing = false; alert(res.message); this.load(); },
      error: (e) => { this.publishing = false; alert(e?.error?.message || 'تعذّر الإلغاء'); },
    });
  }

  exportPdf() {
    this.exporting = true;
    const params: any = { date: this.anchorDate };
    if (this.filters.shop_id) params.shop_id = this.filters.shop_id;
    if (this.filters.role) params.role = this.filters.role;
    if (this.filters.user_id) params.user_id = this.filters.user_id;
    if (this.filters.status) params.status = this.filters.status;

    this.hr.exportSchedule(params).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `weekly-schedule-${this.roster?.from ?? this.anchorDate}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting = false;
      },
      error: () => { this.exporting = false; },
    });
  }

  // ── Shift template management ───────────────────
  openShiftAdmin() {
    this.shiftForm = { name: '', color: 'blue', start_time: '', end_time: '', description: '' };
    this.editingTemplateId = null;
    this.showShiftAdmin = true;
    this.loadManageTemplates();
  }

  private loadManageTemplates() {
    this.hr.getAllShiftTemplates().subscribe({ next: (t) => (this.manageTemplates = t || []), error: () => {} });
  }

  saveShiftTemplate() {
    if (!this.shiftForm.name || !this.shiftForm.start_time || !this.shiftForm.end_time) return;
    this.shiftSaving = true;
    this.hr.createShiftTemplate(this.shiftForm).subscribe({
      next: () => {
        this.shiftSaving = false;
        this.loadShiftTemplates();
        this.loadManageTemplates();
        this.shiftForm = { name: '', color: 'blue', start_time: '', end_time: '', description: '' };
      },
      error: (e) => { this.shiftSaving = false; alert(e?.error?.message || 'تعذّر الحفظ'); },
    });
  }

  startEditTemplate(t: any) {
    this.editingTemplateId = t.id;
    this.templateEditForm = { name: t.name, color: t.color, start_time: t.start_time, end_time: t.end_time, description: t.description || '' };
  }

  cancelEditTemplate() { this.editingTemplateId = null; }

  /** Times changed → ask the admin how the edit should propagate to already-scheduled entries. Metadata-only edits (name/color/description) save immediately, no propagation needed. */
  submitTemplateEdit(t: any) {
    const timeChanged = this.templateEditForm.start_time !== t.start_time || this.templateEditForm.end_time !== t.end_time;
    this.pendingTemplateEditId = t.id;
    this.pendingTemplateEditPayload = { ...this.templateEditForm };

    if (timeChanged) {
      this.scopeChoice = 'future';
      this.showScopeDialog = true;
    } else {
      this.applyTemplateEdit();
    }
  }

  confirmScopeAndSave() {
    this.showScopeDialog = false;
    this.applyTemplateEdit(this.scopeChoice);
  }

  private applyTemplateEdit(scope?: 'future' | 'unpublished' | 'all') {
    if (!this.pendingTemplateEditId) return;
    this.templateBusyId = this.pendingTemplateEditId;
    const payload = scope ? { ...this.pendingTemplateEditPayload, scope } : this.pendingTemplateEditPayload;
    this.hr.updateShiftTemplate(this.pendingTemplateEditId, payload).subscribe({
      next: () => {
        this.templateBusyId = null;
        this.editingTemplateId = null;
        this.pendingTemplateEditId = null;
        this.loadShiftTemplates();
        this.loadManageTemplates();
      },
      error: (e) => { this.templateBusyId = null; alert(e?.error?.message || 'تعذّر التحديث'); },
    });
  }

  archiveTemplate(t: any) {
    this.templateBusyId = t.id;
    this.hr.archiveShiftTemplate(t.id).subscribe({
      next: () => { this.templateBusyId = null; this.loadShiftTemplates(); this.loadManageTemplates(); },
      error: (e) => { this.templateBusyId = null; alert(e?.error?.message || 'تعذّر التعطيل'); },
    });
  }

  restoreTemplate(t: any) {
    this.templateBusyId = t.id;
    this.hr.restoreShiftTemplate(t.id).subscribe({
      next: () => { this.templateBusyId = null; this.loadShiftTemplates(); this.loadManageTemplates(); },
      error: (e) => { this.templateBusyId = null; alert(e?.error?.message || 'تعذّر التفعيل'); },
    });
  }

  deleteTemplate(t: any) {
    if (!confirm(`حذف قالب "${t.name}" نهائيًا؟`)) return;
    this.templateBusyId = t.id;
    this.hr.deleteShiftTemplate(t.id).subscribe({
      next: () => { this.templateBusyId = null; this.loadShiftTemplates(); this.loadManageTemplates(); },
      error: (e) => { this.templateBusyId = null; alert(e?.error?.message || 'تعذّر الحذف'); },
    });
  }
}
