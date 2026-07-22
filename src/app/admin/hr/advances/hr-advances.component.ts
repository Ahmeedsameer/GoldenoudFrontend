import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../services/hr.service';
import { AuthService } from '../../../services/auth.service';
import { ShopService } from '../../../services/shop.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';

type PlanMode = 'date_range' | 'fixed_amount' | 'fixed_months' | 'custom';

@Component({
  selector: 'app-hr-advances',
  imports: [CommonModule, FormsModule, LoadingComponent, ModalComponent, DatePickerComponent],
  templateUrl: './hr-advances.component.html',
})
export class HrAdvancesComponent implements OnInit {
  private hr = inject(HrService);
  private auth = inject(AuthService);
  private shopService = inject(ShopService);

  loading = false;
  busyId: number | null = null;
  myRole = this.auth.getUserRole();
  isAdmin = this.myRole === 'admin';

  rows: any[] = [];
  activeStatus = 'pending';
  /** Every "pending" advance request needs the admin's action — managers are read-only here, so the badge is admin-only. */
  pendingCount = 0;
  statusTabs = [
    { value: 'pending', label: 'قيد المراجعة' },
    { value: 'active', label: 'نشطة' },
    { value: 'rejected', label: 'مرفوضة' },
    { value: 'completed', label: 'مكتملة' },
    { value: 'cancelled', label: 'ملغاة' },
  ];

  // ── Filters ────────────────────────────────────────
  shops: { id: number; name: string }[] = [];
  employees: { id: number; name: string }[] = [];
  filters = { shop_id: '', user_id: '', search: '' };

  // ── Approve + plan builder modal ─────────────────
  showApprove = false;
  approveTarget: any = null;
  approveError = '';
  now = new Date();
  approveForm = {
    approved_amount: 0,
    mode: 'date_range' as PlanMode,
    monthly_amount: 0,
    months: 1,
    schedule: [0],
    start_year: this.now.getFullYear(),
    start_month: this.now.getMonth() + 2 > 12 ? 1 : this.now.getMonth() + 2,
    end_year: this.now.getFullYear(),
    end_month: this.now.getMonth() + 2 > 12 ? 1 : this.now.getMonth() + 2,
  };

  // ── Reject modal ──────────────────────────────────
  showReject = false;
  rejectTarget: any = null;
  rejectReason = '';

  // ── Detail / repayment modal ──────────────────────
  showDetail = false;
  detail: any = null;
  detailLoading = false;
  repaymentForm = { amount: 0, date: this.iso(new Date()), notes: '' };
  showPlanEdit = false;
  planEditForm = {
    mode: 'date_range' as PlanMode, monthly_amount: 0, months: 1, schedule: [0],
    end_year: this.now.getFullYear(), end_month: this.now.getMonth() + 1,
  };

  modeLabels: Record<string, string> = { date_range: 'فترة بداية/نهاية', fixed_amount: 'مبلغ شهري ثابت', fixed_months: 'عدد أشهر ثابت', custom: 'خطة مخصصة' };
  statusLabels: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
    active:    { label: 'نشطة',         cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' },
    rejected:  { label: 'مرفوضة',       cls: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' },
    completed: { label: 'مكتملة',       cls: 'bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-gray-400' },
    cancelled: { label: 'ملغاة',        cls: 'bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-gray-500' },
  };
  installmentStatusMeta: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'قادم', cls: 'text-gray-400' },
    due:       { label: 'مستحق هذا الشهر', cls: 'text-amber-600 dark:text-amber-400' },
    paid:      { label: 'مدفوع', cls: 'text-success-600 dark:text-success-400' },
    skipped:   { label: 'أُلغي', cls: 'text-gray-400' },
    cancelled: { label: 'مُلغى', cls: 'text-gray-400' },
  };

  ngOnInit(): void {
    this.shopService.getShops({ page: -1 }).subscribe({ next: (r) => this.shops = r.data?.data || r.data || r || [], error: () => {} });
    this.hr.getEmployees({ page: -1 }).subscribe({ next: (r) => this.employees = (r.data?.data || r.data || r || []).map((e: any) => ({ id: e.id, name: e.name })), error: () => {} });
    this.load();
    if (this.isAdmin) { this.loadPendingCount(); }
  }

  private loadPendingCount(): void {
    this.hr.getAdvances({ status: 'pending', per_page: 1 }).subscribe({
      next: (r) => { this.pendingCount = r?.total ?? r?.data?.total ?? 0; },
    });
  }

  private iso(d: Date) { return d.toISOString().substring(0, 10); }

  setStatus(v: string) { this.activeStatus = v; this.load(); }

  load() {
    this.loading = true;
    const params: any = { status: this.activeStatus };
    if (this.filters.shop_id) params.shop_id = this.filters.shop_id;
    if (this.filters.user_id) params.user_id = this.filters.user_id;
    if (this.filters.search) params.search = this.filters.search;

    this.hr.getAdvances(params).subscribe({
      next: (r) => { this.rows = r?.data ?? []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  installmentStatusLabel(s: string): string {
    return this.installmentStatusMeta[s]?.label || s;
  }

  installmentStatusClass(s: string): string {
    return this.installmentStatusMeta[s]?.cls || 'text-gray-400';
  }

  // ── Approve + plan ────────────────────────────────
  openApprove(row: any) {
    this.approveTarget = row;
    this.approveError = '';
    const startMonth = this.now.getMonth() + 2 > 12 ? 1 : this.now.getMonth() + 2;
    const startYear = this.now.getMonth() + 2 > 12 ? this.now.getFullYear() + 1 : this.now.getFullYear();
    this.approveForm = {
      approved_amount: Number(row.requested_amount),
      mode: 'date_range', monthly_amount: 0, months: 1, schedule: [0],
      start_year: startYear, start_month: startMonth, end_year: startYear, end_month: startMonth,
    };
    this.showApprove = true;
  }

  addScheduleRow() { this.approveForm.schedule.push(0); }
  removeScheduleRow(i: number) { this.approveForm.schedule.splice(i, 1); }

  get scheduleSum(): number {
    return this.approveForm.schedule.reduce((s, v) => s + (Number(v) || 0), 0);
  }

  get estimatedInstallments(): number | null {
    const f = this.approveForm;
    if (f.mode === 'date_range' && f.start_year && f.start_month && f.end_year && f.end_month) {
      return (f.end_year - f.start_year) * 12 + (f.end_month - f.start_month) + 1;
    }
    if (f.mode === 'fixed_amount' && f.monthly_amount > 0) return Math.ceil(f.approved_amount / f.monthly_amount);
    if (f.mode === 'fixed_months') return f.months;
    if (f.mode === 'custom') return f.schedule.length;
    return null;
  }

  get estimatedMonthlyAmount(): number | null {
    const n = this.estimatedInstallments;
    return n && n > 0 ? Math.round((this.approveForm.approved_amount / n) * 100) / 100 : null;
  }

  confirmApprove() {
    if (!this.approveTarget) return;
    const f = this.approveForm;
    if (!f.approved_amount || f.approved_amount <= 0) { this.approveError = 'أدخل المبلغ المعتمد'; return; }
    const payload: any = { approved_amount: f.approved_amount, mode: f.mode, start_year: f.start_year, start_month: f.start_month };
    if (f.mode === 'date_range') { payload.end_year = f.end_year; payload.end_month = f.end_month; }
    if (f.mode === 'fixed_amount') payload.monthly_amount = f.monthly_amount;
    if (f.mode === 'fixed_months') payload.months = f.months;
    if (f.mode === 'custom') payload.schedule = f.schedule;

    this.busyId = this.approveTarget.id;
    this.hr.approveAdvance(this.approveTarget.id, payload).subscribe({
      next: () => { this.busyId = null; this.showApprove = false; this.load(); this.loadPendingCount(); },
      error: (e) => { this.busyId = null; this.approveError = e?.error?.message || this.firstValidationError(e) || 'تعذّرت الموافقة'; },
    });
  }

  private firstValidationError(e: any): string | null {
    const errors = e?.error?.errors;
    if (!errors) return null;
    const first = Object.values(errors)[0];
    return Array.isArray(first) ? (first[0] as string) : null;
  }

  // ── Reject ─────────────────────────────────────────
  openReject(row: any) { this.rejectTarget = row; this.rejectReason = ''; this.showReject = true; }

  confirmReject() {
    if (!this.rejectTarget) return;
    this.busyId = this.rejectTarget.id;
    this.hr.rejectAdvance(this.rejectTarget.id, this.rejectReason || undefined).subscribe({
      next: () => { this.busyId = null; this.showReject = false; this.load(); this.loadPendingCount(); },
      error: (e) => { this.busyId = null; alert(e?.error?.message || 'تعذّر الرفض'); },
    });
  }

  // ── Cancel (before any deduction) ─────────────────
  canCancel(row: any): boolean {
    return this.isAdmin && row.status === 'active' && Number(row.paid_amount) === 0;
  }

  cancelAdvance(row: any) {
    if (!confirm('إلغاء هذه السلفة المعتمدة؟ لم يتم خصم أي قسط منها بعد.')) return;
    this.busyId = row.id;
    this.hr.cancelAdvance(row.id).subscribe({
      next: () => { this.busyId = null; this.load(); },
      error: (e) => { this.busyId = null; alert(e?.error?.message || 'تعذّر الإلغاء'); },
    });
  }

  // ── Detail / repayment / plan edit ────────────────
  openDetail(row: any) {
    this.showDetail = true;
    this.detailLoading = true;
    this.repaymentForm = { amount: 0, date: this.iso(new Date()), notes: '' };
    this.hr.getAdvance(row.id).subscribe({
      next: (d) => { this.detail = d; this.detailLoading = false; },
      error: () => { this.detailLoading = false; },
    });
  }

  recordRepayment() {
    if (!this.detail || !this.repaymentForm.amount) return;
    this.busyId = this.detail.id;
    this.hr.recordAdvanceRepayment(this.detail.id, this.repaymentForm).subscribe({
      next: (r) => { this.busyId = null; this.detail = r.data; this.repaymentForm = { amount: 0, date: this.iso(new Date()), notes: '' }; this.load(); },
      error: (e) => { this.busyId = null; alert(e?.error?.message || 'تعذّر تسجيل السداد'); },
    });
  }

  openPlanEdit() {
    this.planEditForm = { mode: 'date_range', monthly_amount: 0, months: 1, schedule: [0], end_year: this.now.getFullYear(), end_month: this.now.getMonth() + 1 };
    this.showPlanEdit = true;
  }

  addPlanScheduleRow() { this.planEditForm.schedule.push(0); }
  removePlanScheduleRow(i: number) { this.planEditForm.schedule.splice(i, 1); }

  savePlanEdit() {
    if (!this.detail) return;
    const f = this.planEditForm;
    const payload: any = { mode: f.mode };
    if (f.mode === 'date_range') { payload.end_year = f.end_year; payload.end_month = f.end_month; }
    if (f.mode === 'fixed_amount') payload.monthly_amount = f.monthly_amount;
    if (f.mode === 'fixed_months') payload.months = f.months;
    if (f.mode === 'custom') payload.schedule = f.schedule;

    this.busyId = this.detail.id;
    this.hr.updateAdvancePlan(this.detail.id, payload).subscribe({
      next: (r) => { this.busyId = null; this.showPlanEdit = false; this.detail = { ...this.detail, installments: r.data.installments }; this.load(); },
      error: (e) => { this.busyId = null; alert(e?.error?.message || 'تعذّر تحديث الخطة'); },
    });
  }
}
