import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SafeService } from '../../services/safe.service';
import { Safe, Currency, TransactionReason } from '../../models/safe.model';
import { LoadingComponent } from '../../loading/loading.component';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-manager-safe',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LoadingComponent, ModalComponent, AlertComponent],
  templateUrl: './manager-safe.component.html',
})
export class ManagerSafeComponent implements OnInit {
  private safeService = inject(SafeService);
  private fb = inject(FormBuilder);

  safes: Safe[] = [];
  loading = false;

  currencies: Currency[] = [];
  depositReasons: TransactionReason[] = [];
  withdrawReasons: TransactionReason[] = [];

  // ── Modal ────────────────────────────────────────────────
  showModal = false;
  modalMode: 'deposit' | 'withdraw' = 'deposit';
  activeSafe: Safe | null = null;
  modalLoading = false;
  modalError = '';

  form: FormGroup = this.fb.group({
    currency_id: [null, Validators.required],
    amount:      [null, [Validators.required, Validators.min(0.01)]],
    reason_id:   [null, Validators.required],
    note:        [''],
  });

  get activeReasons(): TransactionReason[] {
    return this.modalMode === 'deposit' ? this.depositReasons : this.withdrawReasons;
  }

  // ── Alert ────────────────────────────────────────────────
  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  ngOnInit(): void {
    this.load();
    this.safeService.getManagerCurrencies({ active_only: true }).subscribe({ next: (r) => this.currencies = r.data });
    this.safeService.getManagerReasons({ direction: 'in',  active_only: true }).subscribe({ next: (r) => this.depositReasons  = r.data });
    this.safeService.getManagerReasons({ direction: 'out', active_only: true }).subscribe({ next: (r) => this.withdrawReasons = r.data });
  }

  load() {
    this.loading = true;
    this.safeService.getMyShopSafes().subscribe({
      next: (res) => { this.safes = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openDeposit(safe: Safe) {
    this.activeSafe = safe;
    this.modalMode = 'deposit';
    this.modalError = '';
    this.form.reset({ currency_id: null, amount: null, reason_id: null, note: '' });
    this.showModal = true;
  }

  openWithdraw(safe: Safe) {
    this.activeSafe = safe;
    this.modalMode = 'withdraw';
    this.modalError = '';
    this.form.reset({ currency_id: null, amount: null, reason_id: null, note: '' });
    this.showModal = true;
  }

  submit() {
    if (this.form.invalid || !this.activeSafe) { this.form.markAllAsTouched(); return; }
    this.modalLoading = true;
    this.modalError = '';

    const v = this.form.value;
    const body = { currency_id: +v.currency_id, amount: +v.amount, reason_id: +v.reason_id, note: v.note || undefined };
    const req$ = this.modalMode === 'deposit'
      ? this.safeService.managerDeposit(this.activeSafe.id, body)
      : this.safeService.managerWithdraw(this.activeSafe.id, body);

    req$.subscribe({
      next: (res) => {
        this.modalLoading = false;
        this.showModal = false;
        const sym = this.currencies.find(c => c.id === +v.currency_id)?.symbol ?? '';
        this.alert = { show: true, type: 'success', message: `${res.message} — الرصيد الجديد: ${sym} ${res.new_balance}` };
        this.load();
      },
      error: (err) => {
        this.modalLoading = false;
        this.modalError = err?.error?.message || 'حدث خطأ غير متوقع.';
      },
    });
  }

  f(name: string) { return this.form.get(name); }
  isInvalid(name: string) { return this.f(name)?.invalid && this.f(name)?.touched; }
}
