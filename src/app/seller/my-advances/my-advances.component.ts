import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../services/hr.service';
import { LoadingComponent } from '../../loading/loading.component';
import { DatePickerComponent } from '../../shared/components/form/date-picker/date-picker.component';

@Component({
  selector: 'app-my-advances',
  imports: [CommonModule, FormsModule, LoadingComponent, DatePickerComponent],
  templateUrl: './my-advances.component.html',
})
export class MyAdvancesComponent implements OnInit {
  private hr = inject(HrService);

  loading = false;
  submitting = false;
  error = '';
  advances: any[] = [];

  today = new Date().toISOString().substring(0, 10);
  form = { requested_amount: null as number | null, reason: '', notes: '', request_date: this.today };

  modeLabels: Record<string, string> = { date_range: 'فترة بداية/نهاية', fixed_amount: 'مبلغ شهري ثابت', fixed_months: 'عدد أشهر ثابت', custom: 'خطة مخصصة' };
  statusLabels: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
    active:    { label: 'نشطة',         cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' },
    rejected:  { label: 'مرفوضة',       cls: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' },
    completed: { label: 'مكتملة',       cls: 'bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-gray-400' },
    cancelled: { label: 'ملغاة',        cls: 'bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-gray-500' },
  };
  installmentIcons: Record<string, string> = { pending: '⏳', due: '🟡', paid: '✅', skipped: '⚪', cancelled: '⚪' };
  installmentLabels: Record<string, string> = { pending: 'قادم', due: 'مستحق', paid: 'مدفوع', skipped: 'أُلغي', cancelled: 'مُلغى' };

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.hr.myAdvances().subscribe({
      next: (d) => { this.advances = d?.data ?? []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  private pendingInstallments(adv: any): any[] {
    return (adv.installments || []).filter((i: any) => i.status === 'pending');
  }

  currentInstallment(adv: any): any {
    return (adv.installments || []).find((i: any) => i.effective_status === 'due') || null;
  }

  nextInstallment(adv: any): any {
    const pending = this.pendingInstallments(adv).sort((a, b) => a.sequence - b.sequence);
    const current = this.currentInstallment(adv);
    return pending.find((i) => i !== current) || (!current ? pending[0] : null) || null;
  }

  completionPercent(adv: any): number {
    if (!adv.approved_amount || Number(adv.approved_amount) <= 0) return 0;
    return Math.min(100, Math.round((Number(adv.paid_amount) / Number(adv.approved_amount)) * 100));
  }

  startMonthLabel(adv: any): string {
    const first = (adv.installments || []).slice().sort((a: any, b: any) => a.sequence - b.sequence)[0];
    return first ? `${first.period_month}/${first.period_year}` : '—';
  }

  endMonthLabel(adv: any): string {
    const last = (adv.installments || []).slice().sort((a: any, b: any) => b.sequence - a.sequence)[0];
    return last ? `${last.period_month}/${last.period_year}` : '—';
  }

  submit() {
    if (!this.form.requested_amount || !this.form.reason) {
      this.error = 'يرجى إدخال المبلغ المطلوب والسبب';
      return;
    }
    this.error = '';
    this.submitting = true;
    this.hr.requestAdvance({ ...this.form, requested_amount: this.form.requested_amount! }).subscribe({
      next: () => {
        this.submitting = false;
        this.form = { requested_amount: null, reason: '', notes: '', request_date: this.today };
        this.load();
      },
      error: (e) => { this.submitting = false; this.error = e?.error?.message || 'تعذّر إرسال الطلب'; },
    });
  }
}
