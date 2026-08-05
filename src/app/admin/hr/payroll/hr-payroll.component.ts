import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HrService } from '../../../services/hr.service';
import { SafeService } from '../../../services/safe.service';
import { ShopService } from '../../../services/shop.service';
import { ListManager } from '../../../services/list-manager';
import { LoadingComponent } from '../../../loading/loading.component';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { SearchBarComponent } from '../../../shared/components/common/search-bar/search-bar.component';
import { ReportKpiCardComponent } from '../../../shared/components/reports/report-kpi-card/report-kpi-card.component';

/**
 * Payroll Management — extends the existing Payroll page (generate/lock/
 * unlock/detail-breakdown all reused as-is) with: summary cards, branch/
 * employee/status filters + search + pagination (mirroring
 * hr-settlements.component.ts's pattern), cashbox-linked "Pay Salary" /
 * "Pay All Pending" (real money through Safe — see PayrollService::pay()),
 * and a Cash History section in the detail modal.
 */
@Component({
  selector: 'app-hr-payroll',
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, PaginationComponent, ModalComponent, SearchBarComponent, ReportKpiCardComponent],
  templateUrl: './hr-payroll.component.html',
})
export class HrPayrollComponent implements OnInit {
  private hr = inject(HrService);
  private safeSvc = inject(SafeService);
  private shopSvc = inject(ShopService);

  generating = false;
  busyId: number | null = null;

  now = new Date();
  year = this.now.getFullYear();
  month = this.now.getMonth() + 1;
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  years = [this.now.getFullYear() - 1, this.now.getFullYear(), this.now.getFullYear() + 1];
  statusFilter = '';
  shopId: number | null = null;

  list = new ListManager<any>((params) => this.hr.getPayrolls(params));
  shops: { id: number; name: string }[] = [];
  safes: any[] = [];

  summary: { pending_count: number; paid_count: number; total_amount: number; total_paid: number; remaining: number } | null = null;
  summaryLoading = false;

  // breakdown modal
  showDetail = false;
  detail: any = null;
  detailTransactions: any[] = [];
  detailTransactionsLoading = false;

  // deduction settings
  showSettings = false;
  settings: any[] = [];

  // ── Pay Salary (single) ────────────────────────
  showPay = false;
  payTarget: any = null;
  paySafeId: number | null = null;
  payError = '';
  payLoading = false;

  // ── Bulk Pay All Pending ────────────────────────
  showBulkPay = false;
  bulkSafeId: number | null = null;
  bulkLoading = false;
  bulkError = '';
  bulkResult: { paid: any[]; failed: any[] } | null = null;

  ngOnInit(): void {
    this.applyFilters();
    this.loadSummary();
    this.shopSvc.getShops({ per_page: 200 }).subscribe({ next: (res) => { this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });
    this.safeSvc.getSafes().subscribe({ next: (r) => { this.safes = r.data || []; }, error: () => {} });
  }

  /** "نوع الخزنة — اسم الفرع" (or "الشركة") — matches Safe Management's own naming convention. */
  safeLabel(safe: any): string {
    const location = safe.shop ? safe.shop.name : 'الشركة';
    return `${safe.safe_type?.name || 'خزنة'} — ${location}`;
  }

  get baseFilters() {
    return {
      year: this.year, month: this.month,
      status: this.statusFilter || undefined,
      shop_id: this.shopId || undefined,
    };
  }

  /** Initial load only — subsequent filter changes go through the individual setters below (one request each, not four). */
  applyFilters() {
    this.list.filters = { ...this.list.filters, ...this.baseFilters };
    this.list.load();
    this.loadSummary();
  }

  setYear(value: number) { this.year = value; this.list.setFilter('year', value); this.loadSummary(); }
  setMonth(value: number) { this.month = value; this.list.setFilter('month', value); this.loadSummary(); }
  setStatusFilter(value: string) { this.statusFilter = value; this.list.setFilter('status', value || undefined); this.loadSummary(); }
  setShopFilter(value: number | null) { this.shopId = value; this.list.setFilter('shop_id', value || undefined); this.loadSummary(); }
  setSearch(value: string) { this.list.setFilter('search', value || undefined); }

  loadSummary() {
    this.summaryLoading = true;
    this.hr.getPayrollSummary(this.baseFilters).subscribe({
      next: (s) => { this.summary = s; this.summaryLoading = false; },
      error: () => { this.summaryLoading = false; },
    });
  }

  generateAll() {
    if (!confirm(`توليد كشوف رواتب كل الموظفين لشهر ${this.month}/${this.year}؟`)) return;
    this.generating = true;
    this.hr.generatePayroll({ year: this.year, month: this.month }).subscribe({
      next: () => { this.generating = false; this.list.load(); this.loadSummary(); },
      error: (e) => { this.generating = false; alert(e?.error?.message || 'تعذّر التوليد'); },
    });
  }

  openDetail(p: any) {
    this.showDetail = true;
    this.detail = null;
    this.detailTransactions = [];
    this.hr.getPayroll(p.id).subscribe({ next: (d) => this.detail = d, error: () => {} });
    this.detailTransactionsLoading = true;
    this.hr.getPayrollTransactions(p.id).subscribe({
      next: (tx) => { this.detailTransactions = tx || []; this.detailTransactionsLoading = false; },
      error: () => { this.detailTransactionsLoading = false; },
    });
  }

  lock(p: any)   { this.act(p, () => this.hr.lockPayroll(p.id)); }
  unlock(p: any) { this.act(p, () => this.hr.unlockPayroll(p.id)); }

  private act(p: any, fn: () => any) {
    this.busyId = p.id;
    fn().subscribe({
      next: () => { this.busyId = null; this.list.load(); this.loadSummary(); },
      error: (e: any) => { this.busyId = null; alert(e?.error?.message || 'تعذّر'); },
    });
  }

  // ── Pay Salary (single, cashbox-linked) ─────────
  openPay(p: any) {
    this.payTarget = p;
    this.paySafeId = null;
    this.payError = '';
    this.showPay = true;
  }

  submitPay() {
    if (!this.payTarget) return;
    if (!this.paySafeId) { this.payError = 'اختر الخزنة التي سيُصرف منها الراتب'; return; }

    this.payLoading = true;
    this.payError = '';
    this.hr.payPayroll(this.payTarget.id, this.paySafeId).subscribe({
      next: () => {
        this.payLoading = false;
        this.showPay = false;
        this.list.load();
        this.loadSummary();
      },
      error: (e) => {
        this.payLoading = false;
        this.payError = e?.error?.message || 'تعذّر صرف الراتب';
      },
    });
  }

  // ── Bulk Pay All Pending ─────────────────────────
  openBulkPay() {
    this.bulkSafeId = null;
    this.bulkError = '';
    this.bulkResult = null;
    this.showBulkPay = true;
  }

  submitBulkPay() {
    if (!this.bulkSafeId) { this.bulkError = 'اختر الخزنة التي ستُصرف منها كل المرتبات'; return; }

    this.bulkLoading = true;
    this.bulkError = '';
    this.hr.payAllPayrolls({ safe_id: this.bulkSafeId, year: this.year, month: this.month, shop_id: this.shopId || undefined }).subscribe({
      next: (res) => {
        this.bulkLoading = false;
        this.bulkResult = res.data;
        this.list.load();
        this.loadSummary();
      },
      error: (e) => {
        this.bulkLoading = false;
        this.bulkError = e?.error?.message || 'تعذّر صرف المرتبات';
      },
    });
  }

  // ── Deduction settings ──────────────────────────
  openSettings() {
    this.showSettings = true;
    this.hr.getDeductionSettings().subscribe({ next: (s) => this.settings = s || [], error: () => {} });
  }

  saveSetting(s: any) {
    this.hr.updateDeductionSetting(s.id, { value: s.value, mode: s.mode, is_active: s.is_active }).subscribe({
      next: () => { s._saved = true; setTimeout(() => s._saved = false, 1500); },
      error: (e) => alert(e?.error?.message || 'تعذّر الحفظ'),
    });
  }
}
