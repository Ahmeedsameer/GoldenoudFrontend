import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { SafeService } from '../../services/safe.service';
import { Safe, TransactionReason } from '../../models/safe.model';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';

export interface ReconciliationEntry {
  safeId:         number;
  safeName:       string;
  currencyId:     number;
  currencyCode:   string;
  currencySymbol: string;
  systemBalance:  number;
  countedAmount:  number | null;
}

@Component({
  selector: 'app-safe-reconciliation',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent],
  templateUrl: './safe-reconciliation.component.html',
})
export class SafeReconciliationComponent implements OnInit {
  private safeService = inject(SafeService);

  // ── State ─────────────────────────────────────────────────────────
  loading    = false;
  submitting = false;
  errorMsg   = '';
  successMsg = '';

  entries:         ReconciliationEntry[] = [];
  depositReasons:  TransactionReason[]   = [];
  withdrawReasons: TransactionReason[]   = [];

  selectedDepositReasonId:  number | null = null;
  selectedWithdrawReasonId: number | null = null;
  note = '';

  // ── Lifecycle ─────────────────────────────────────────────────────
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading  = true;
    this.errorMsg = '';

    forkJoin({
      safes:          this.safeService.getMyShopSafes().pipe(map((r: any) => r.data as Safe[])),
      depositReasons:  this.safeService.getManagerReasons({ direction: 'in',  active_only: true }).pipe(map((r: any) => r.data as TransactionReason[])),
      withdrawReasons: this.safeService.getManagerReasons({ direction: 'out', active_only: true }).pipe(map((r: any) => r.data as TransactionReason[])),
    }).subscribe({
      next: ({ safes, depositReasons, withdrawReasons }) => {
        // Only physical safes are reconciled
        const physical = safes.filter(s => s.safe_type?.kind === 'physical');

        this.entries = physical.flatMap(safe =>
          (safe.balances ?? []).map(b => ({
            safeId:         safe.id,
            safeName:       safe.safe_type?.name ?? `خزنة ${safe.id}`,
            currencyId:     b.currency.id,
            currencyCode:   b.currency.code,
            currencySymbol: b.currency.symbol,
            systemBalance:  parseFloat(b.balance as any),
            countedAmount:  null,
          }))
        );

        this.depositReasons  = depositReasons;
        this.withdrawReasons = withdrawReasons;
        this.loading = false;
      },
      error: () => {
        this.loading  = false;
        this.errorMsg = 'فشل تحميل بيانات الخزنة. يرجى المحاولة مرة أخرى.';
      },
    });
  }

  // ── Computed helpers ──────────────────────────────────────────────
  variance(entry: ReconciliationEntry): number | null {
    if (entry.countedAmount === null || entry.countedAmount === undefined) return null;
    return +(entry.countedAmount - entry.systemBalance).toFixed(4);
  }

  varianceLabel(entry: ReconciliationEntry): string {
    const v = this.variance(entry);
    if (v === null) return '—';
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(2)}`;
  }

  varianceClass(entry: ReconciliationEntry): string {
    const v = this.variance(entry);
    if (v === null) return 'text-gray-400 dark:text-gray-500';
    if (v > 0)  return 'text-success-600 dark:text-success-400 font-bold';
    if (v < 0)  return 'text-error-600 dark:text-error-400 font-bold';
    return 'text-gray-500 dark:text-gray-400';
  }

  badgeClass(entry: ReconciliationEntry): string {
    const v = this.variance(entry);
    if (v === null) return 'bg-gray-100 text-gray-400 dark:bg-white/[0.05] dark:text-gray-500';
    if (v > 0)  return 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    if (v < 0)  return 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-300';
    return 'bg-gray-100 text-gray-400 dark:bg-white/[0.05] dark:text-gray-500';
  }

  get needsDeposit(): boolean {
    return this.entries.some(e => { const v = this.variance(e); return v !== null && v > 0; });
  }

  get needsWithdraw(): boolean {
    return this.entries.some(e => { const v = this.variance(e); return v !== null && v < 0; });
  }

  get pendingCount(): number {
    return this.entries.filter(e => { const v = this.variance(e); return v !== null && v !== 0; }).length;
  }

  get anyEntryCounted(): boolean {
    return this.entries.some(e => e.countedAmount !== null);
  }

  canSubmit(): boolean {
    if (this.pendingCount === 0) return false;
    if (this.needsDeposit  && !this.selectedDepositReasonId)  return false;
    if (this.needsWithdraw && !this.selectedWithdrawReasonId) return false;
    return true;
  }

  // ── Submit ────────────────────────────────────────────────────────
  submit(): void {
    if (!this.canSubmit() || this.submitting) return;

    this.submitting = true;
    this.errorMsg   = '';
    this.successMsg = '';

    const calls = this.entries
      .filter(e => { const v = this.variance(e); return v !== null && v !== 0; })
      .map(e => {
        const v         = this.variance(e)!;
        const isDeposit = v > 0;
        const reasonId  = isDeposit ? this.selectedDepositReasonId! : this.selectedWithdrawReasonId!;
        const body      = {
          currency_id: e.currencyId,
          amount:      Math.abs(v),
          reason_id:   reasonId,
          note:        this.note || undefined,
        };
        return isDeposit
          ? this.safeService.managerDeposit(e.safeId, body)
          : this.safeService.managerWithdraw(e.safeId, body);
      });

    forkJoin(calls).subscribe({
      next: () => {
        this.submitting  = false;
        this.successMsg  = 'تم تسجيل التسوية بنجاح وتم تحديث أرصدة الخزنة.';
        this.note        = '';
        this.selectedDepositReasonId  = null;
        this.selectedWithdrawReasonId = null;
        this.load();
      },
      error: () => {
        this.submitting = false;
        this.errorMsg   = 'حدث خطأ أثناء حفظ التسوية. يرجى المحاولة مرة أخرى.';
      },
    });
  }
}
