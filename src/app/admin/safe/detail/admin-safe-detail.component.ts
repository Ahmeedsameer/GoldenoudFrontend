import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { SafeService } from '../../../services/safe.service';
import { Safe, SafeTransaction, TransactionType, Currency, TransactionReason } from '../../../models/safe.model';
import { ListManager } from '../../../services/list-manager';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';

@Component({
  selector: 'app-admin-safe-detail',
  imports: [CommonModule, ReactiveFormsModule, LoadingComponent, ModalComponent, AlertComponent, PaginationComponent, DatePickerComponent],
  templateUrl: './admin-safe-detail.component.html',
})
export class AdminSafeDetailComponent implements OnInit {
  private safeService = inject(SafeService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  safeId!: number;
  safe: Safe | null = null;
  safeLoading = false;

  currencies: Currency[] = [];
  depositReasons: TransactionReason[] = [];
  withdrawReasons: TransactionReason[] = [];
  allSafes: Safe[] = [];

  list = new ListManager<SafeTransaction>(
    (params) => this.safeService.getAdminTransactions(this.safeId, params).pipe(map((r) => r.data))
  );

  // ── Transaction modal ───────────────────────────────────
  showTxModal = false;
  txModalMode: 'deposit' | 'withdraw' = 'deposit';
  txLoading = false;
  txError = '';

  txForm: FormGroup = this.fb.group({
    currency_id: [null, Validators.required],
    amount:      [null, [Validators.required, Validators.min(0.01)]],
    reason_id:   [null, Validators.required],
    note:        [''],
  });

  get activeReasons(): TransactionReason[] {
    return this.txModalMode === 'deposit' ? this.depositReasons : this.withdrawReasons;
  }

  // ── Transfer modal ──────────────────────────────────────
  showTransferModal = false;
  transferLoading = false;
  transferError = '';

  transferForm: FormGroup = this.fb.group({
    to_safe_id:  [null, Validators.required],
    currency_id: [null, Validators.required],
    amount:      [null, [Validators.required, Validators.min(0.01)]],
    note:        [''],
  });

  get otherSafes(): Safe[] {
    return this.allSafes.filter(s => s.id !== this.safeId);
  }

  // ── Alert ───────────────────────────────────────────────
  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  // ── Filter options ──────────────────────────────────────
  typeOptions = [
    { value: '', label: 'كل الأنواع' },
    { value: 'sale', label: 'مبيعات' },
    { value: 'refund', label: 'مرتجع' },
    { value: 'admin_deposit', label: 'إيداع (أدمن)' },
    { value: 'admin_withdrawal', label: 'سحب (أدمن)' },
    { value: 'manager_deposit', label: 'إيداع (مدير)' },
    { value: 'manager_expense', label: 'مصروف (مدير)' },
    { value: 'transfer_in', label: 'تحويل وارد' },
    { value: 'transfer_out', label: 'تحويل صادر' },
  ];

  ngOnInit(): void {
    this.safeId = +this.route.snapshot.params['safeId'];
    this.loadSafe();
    this.list.load();

    forkJoin({
      currencies:      this.safeService.getCurrencies({ active_only: true }),
      depositReasons:  this.safeService.getReasons({ direction: 'in',  active_only: true }),
      withdrawReasons: this.safeService.getReasons({ direction: 'out', active_only: true }),
      allSafes:        this.safeService.getSafes(),
    }).subscribe({
      next: (res) => {
        this.currencies      = res.currencies.data;
        this.depositReasons  = res.depositReasons.data;
        this.withdrawReasons = res.withdrawReasons.data;
        this.allSafes        = res.allSafes.data;
      },
    });
  }

  loadSafe() {
    this.safeLoading = true;
    this.safeService.getSafeById(this.safeId).subscribe({
      next: (res) => { this.safe = res.data; this.safeLoading = false; },
      error: () => { this.safeLoading = false; },
    });
  }

  // ── Filters ─────────────────────────────────────────────
  setTypeFilter(val: string)      { this.list.setFilter('type',       val || undefined); }
  setDirectionFilter(val: string) { this.list.setFilter('direction',  val || undefined); }
  setCurrencyFilter(val: string)  { this.list.setFilter('currency_id', val || undefined); }
  setDateFrom(val: string)        { this.list.setFilter('date_from',  val || undefined); }
  setDateTo(val: string)          { this.list.setFilter('date_to',    val || undefined); }

  // ── Deposit / Withdraw modal ─────────────────────────────
  openDeposit() {
    this.txModalMode = 'deposit';
    this.txForm.reset({ currency_id: null, amount: null, reason_id: null, note: '' });
    this.txError = '';
    this.showTxModal = true;
  }

  openWithdraw() {
    this.txModalMode = 'withdraw';
    this.txForm.reset({ currency_id: null, amount: null, reason_id: null, note: '' });
    this.txError = '';
    this.showTxModal = true;
  }

  submitTx() {
    if (this.txForm.invalid) { this.txForm.markAllAsTouched(); return; }
    this.txLoading = true;
    this.txError = '';

    const v = this.txForm.value;
    const body = { currency_id: +v.currency_id, amount: +v.amount, reason_id: +v.reason_id, note: v.note || undefined };
    const req$ = this.txModalMode === 'deposit'
      ? this.safeService.adminDeposit(this.safeId, body)
      : this.safeService.adminWithdraw(this.safeId, body);

    req$.subscribe({
      next: (res) => {
        this.txLoading = false;
        this.showTxModal = false;
        const sym = this.currencies.find(c => c.id === +v.currency_id)?.symbol ?? '';
        this.alert = { show: true, type: 'success', message: `${res.message} — الرصيد الجديد: ${sym} ${res.new_balance}` };
        this.loadSafe();
        this.list.load();
      },
      error: (err) => {
        this.txLoading = false;
        this.txError = err?.error?.message || 'حدث خطأ غير متوقع.';
      },
    });
  }

  // ── Transfer modal ───────────────────────────────────────
  openTransfer() {
    this.transferForm.reset({ to_safe_id: null, currency_id: null, amount: null, note: '' });
    this.transferError = '';
    this.showTransferModal = true;
  }

  submitTransfer() {
    if (this.transferForm.invalid) { this.transferForm.markAllAsTouched(); return; }
    this.transferLoading = true;
    this.transferError = '';

    const v = this.transferForm.value;
    this.safeService.transfer({
      from_safe_id: this.safeId,
      to_safe_id:   +v.to_safe_id,
      currency_id:  +v.currency_id,
      amount:       +v.amount,
      note:         v.note || undefined,
    }).subscribe({
      next: (res) => {
        this.transferLoading = false;
        this.showTransferModal = false;
        this.alert = { show: true, type: 'success', message: res.message };
        this.loadSafe();
        this.list.load();
      },
      error: (err) => {
        this.transferLoading = false;
        this.transferError = err?.error?.message || 'حدث خطأ غير متوقع.';
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────
  typeLabel(type: TransactionType): string {
    const map: Record<string, string> = {
      sale: 'مبيعات', refund: 'مرتجع',
      admin_deposit: 'إيداع (أدمن)', admin_withdrawal: 'سحب (أدمن)',
      manager_deposit: 'إيداع (مدير)', manager_expense: 'مصروف (مدير)',
      transfer_in: 'تحويل وارد', transfer_out: 'تحويل صادر',
    };
    return map[type] ?? type;
  }

  typeBadgeClass(type: TransactionType): string {
    const inTypes = ['sale', 'admin_deposit', 'manager_deposit', 'transfer_in'];
    return inTypes.includes(type)
      ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400'
      : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400';
  }

  safeName(safe: Safe): string {
    return `${safe.safe_type?.name} — ${safe.shop ? safe.shop.name : 'الشركة'}`;
  }

  tf(name: string) { return this.transferForm.get(name); }
  tfInvalid(name: string) { return this.tf(name)?.invalid && this.tf(name)?.touched; }
  txf(name: string) { return this.txForm.get(name); }
  txfInvalid(name: string) { return this.txf(name)?.invalid && this.txf(name)?.touched; }
}
