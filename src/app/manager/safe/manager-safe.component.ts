import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { SafeService } from '../../services/safe.service';
import { Safe, SafeTransaction, TransactionType } from '../../models/safe.model';
import { ListManager } from '../../services/list-manager';
import { PaginationComponent } from '../../pagination/pagination.component';
import { LoadingComponent } from '../../loading/loading.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-manager-safe',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
    LoadingComponent,
    ButtonComponent,
    ModalComponent,
    AlertComponent,
  ],
  templateUrl: './manager-safe.component.html',
})
export class ManagerSafeComponent implements OnInit {
  private safeService = inject(SafeService);
  private fb = inject(FormBuilder);

  safe: Safe | null = null;
  safeLoading = false;

  list = new ListManager<SafeTransaction>(
    (params) => this.safeService.getMyTransactions(params).pipe(
      map((res: any) => res.data)
    )
  );

  // ── Transaction modal ───────────────────────────────────
  showModal = false;
  modalMode: 'deposit' | 'withdraw' = 'deposit';
  modalLoading = false;
  modalError = '';

  // Note is REQUIRED for managers
  txForm: FormGroup = this.fb.group({
    amount: [null, [Validators.required, Validators.min(0.01)]],
    note:   ['', Validators.required],
  });

  // ── Alert ───────────────────────────────────────────────
  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  // ── Filter options ──────────────────────────────────────
  typeOptions = [
    { value: '',                 label: 'كل الأنواع' },
    { value: 'sale',             label: 'بيع' },
    { value: 'refund',           label: 'استرداد' },
    { value: 'admin_deposit',    label: 'إيداع إداري' },
    { value: 'admin_withdrawal', label: 'سحب إداري' },
    { value: 'manager_deposit',  label: 'إيداع مدير' },
    { value: 'manager_expense',  label: 'مصروف' },
  ];

  ngOnInit(): void {
    this.loadSafe();
    this.list.load();
  }

  loadSafe() {
    this.safeLoading = true;
    this.safeService.getMySafe().subscribe({
      next: (res) => { this.safe = res.data; this.safeLoading = false; },
      error: ()  => { this.safeLoading = false; },
    });
  }

  setTypeFilter(val: string)      { this.list.setFilter('type', val || undefined); }
  setDirectionFilter(val: string) { this.list.setFilter('direction', val || undefined); }
  setDateFrom(val: string)        { this.list.setFilter('date_from', val || undefined); }
  setDateTo(val: string)          { this.list.setFilter('date_to', val || undefined); }

  openDeposit() {
    this.modalMode = 'deposit';
    this.txForm.reset({ amount: null, note: '' });
    this.modalError = '';
    this.showModal = true;
  }

  openWithdraw() {
    this.modalMode = 'withdraw';
    this.txForm.reset({ amount: null, note: '' });
    this.modalError = '';
    this.showModal = true;
  }

  submitModal() {
    if (this.txForm.invalid) { this.txForm.markAllAsTouched(); return; }
    this.modalLoading = true;
    this.modalError = '';

    const { amount, note } = this.txForm.value;
    const req$ = this.modalMode === 'deposit'
      ? this.safeService.managerDeposit(amount, note)
      : this.safeService.managerWithdraw(amount, note);

    req$.subscribe({
      next: (res) => {
        this.modalLoading = false;
        this.showModal = false;
        this.alert = { show: true, type: 'success', message: res.message };
        this.loadSafe();
        this.list.load();
      },
      error: (err) => {
        this.modalLoading = false;
        this.modalError = err?.error?.message || 'حدث خطأ غير متوقع.';
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────

  typeLabel(type: TransactionType): string {
    const map: Record<string, string> = {
      sale:              'بيع',
      refund:            'استرداد',
      admin_deposit:     'إيداع إداري',
      admin_withdrawal:  'سحب إداري',
      manager_deposit:   'إيداع مدير',
      manager_expense:   'مصروف',
    };
    return map[type] ?? type;
  }

  typeBadgeClass(type: TransactionType): string {
    const inTypes = ['sale', 'admin_deposit', 'manager_deposit'];
    return inTypes.includes(type)
      ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400'
      : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400';
  }
}
