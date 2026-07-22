import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  AdminFinancialReportService,
  FinancialSummary,
  FinancialTrendPoint,
  FinancialShopStat,
  SafeBalanceEntry,
  FinancialTransaction,
  FinancialTransactionPage,
  ReportPeriod,
} from '../../../services/admin-financial-report.service';
import { ShopService } from '../../../services/shop.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';

interface PeriodOption { key: ReportPeriod; label: string; }

@Component({
  selector: 'app-admin-financial-report',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule, LoadingComponent, AlertComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './admin-financial-report.component.html',
})
export class AdminFinancialReportComponent implements OnInit {
  private svc     = inject(AdminFinancialReportService);
  private shopSvc = inject(ShopService);

  // ── Period ───────────────────────────────────────────────────────
  period: ReportPeriod = 'month';
  periods: PeriodOption[] = [
    { key: 'today', label: 'اليوم'   },
    { key: 'week',  label: 'الأسبوع' },
    { key: 'month', label: 'الشهر'   },
    { key: 'year',  label: 'السنة'   },
  ];

  // ── Custom date range ────────────────────────────────────────────
  showCustomPicker  = false;
  globalFrom        = '';
  globalTo          = '';
  customRangeActive = false;

  // ── Shop filter ──────────────────────────────────────────────────
  shops: { id: number; name: string }[] = [];
  selectedShopId: number | null = null;

  // ── Loading / error ──────────────────────────────────────────────
  loading  = false;
  errorMsg = '';

  // ── Data ─────────────────────────────────────────────────────────
  summary:   FinancialSummary | null = null;
  trendData: FinancialTrendPoint[]   = [];
  shopStats: FinancialShopStat[]     = [];
  balances:  SafeBalanceEntry[]      = [];

  // ── Transactions ─────────────────────────────────────────────────
  txLoading     = false;
  transactions: FinancialTransaction[]                      = [];
  txMeta:       Omit<FinancialTransactionPage, 'data'> | null = null;

  txPage        = 1;
  txType        = '';
  txDirection   = '';
  txMinAmount:  number | null = null;
  txMaxAmount:  number | null = null;

  // ── Shop table search ─────────────────────────────────────────────
  shopSearch = '';

  // ── Charts ───────────────────────────────────────────────────────
  trendSeries:  any[] = [];
  trendOptions: any   = this.buildAreaOptions();

  // ── Lifecycle ────────────────────────────────────────────────────
  ngOnInit(): void {
    this.shopSvc.getShops({ per_page: 200 }).subscribe({
      next: (res) => {
        this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name }));
      },
    });
    this.load();
  }

  // ── Filter actions ───────────────────────────────────────────────
  setPeriod(p: ReportPeriod): void {
    this.period            = p;
    this.customRangeActive = false;
    this.globalFrom        = '';
    this.globalTo          = '';
    this.showCustomPicker  = false;
    this.reload();
  }

  applyGlobalRange(): void {
    if (!this.globalFrom || !this.globalTo) return;
    this.customRangeActive = true;
    this.showCustomPicker  = false;
    this.reload();
  }

  clearGlobalRange(): void {
    this.globalFrom        = '';
    this.globalTo          = '';
    this.customRangeActive = false;
    this.showCustomPicker  = false;
    this.reload();
  }

  setShop(id: number | null): void {
    this.selectedShopId = id;
    this.reload();
  }

  private dateRange(): [string | undefined, string | undefined] {
    if (this.customRangeActive && this.globalFrom && this.globalTo) {
      return [this.globalFrom, this.globalTo];
    }
    return [undefined, undefined];
  }

  get exportParams(): Record<string, any> {
    const [from, to] = this.dateRange();
    return { period: this.customRangeActive ? undefined : this.period, from, to, shop_id: this.selectedShopId };
  }

  // ── Main load ────────────────────────────────────────────────────
  private load(): void {
    this.loading  = true;
    this.errorMsg = '';
    const [from, to] = this.dateRange();
    const sid = this.selectedShopId;

    forkJoin({
      summary:  this.svc.getSummary(this.period, from, to, sid),
      trend:    this.svc.getTrend(this.period, from, to, sid),
      byShop:   this.svc.getByShop(this.period, from, to, sid),
      balances: this.svc.getBalances(sid),
    }).subscribe({
      next: ({ summary, trend, byShop, balances }) => {
        this.summary   = summary;
        this.trendData = trend;
        this.shopStats = byShop;
        this.balances  = balances;
        this.loading   = false;
        this.buildCharts();
        this.txPage = 1;
        this.loadTransactions();
      },
      error: () => {
        this.loading  = false;
        this.errorMsg = 'فشل تحميل بيانات التقرير. يرجى المحاولة مرة أخرى.';
      },
    });
  }

  reload(): void {
    this.txPage = 1;
    this.load();
  }

  // ── Transactions ─────────────────────────────────────────────────
  loadTransactions(): void {
    this.txLoading = true;
    const [from, to] = this.dateRange();
    this.svc.getTransactions(this.period, from, to, {
      shop_id:    this.selectedShopId,
      type:       this.txType      || undefined,
      direction:  this.txDirection || undefined,
      min_amount: this.txMinAmount ?? undefined,
      max_amount: this.txMaxAmount ?? undefined,
      page:       this.txPage,
      per_page:   30,
    }).subscribe({
      next: (page) => {
        this.transactions = page.data;
        this.txMeta       = { current_page: page.current_page, last_page: page.last_page, total: page.total, per_page: page.per_page };
        this.txLoading    = false;
      },
      error: () => { this.txLoading = false; },
    });
  }

  applyTxFilters(): void  { this.txPage = 1; this.loadTransactions(); }
  resetTxFilters(): void  {
    this.txType = ''; this.txDirection = '';
    this.txMinAmount = null; this.txMaxAmount = null;
    this.txPage = 1;
    this.loadTransactions();
  }
  txNextPage(): void {
    if (this.txMeta && this.txPage < this.txMeta.last_page) { this.txPage++; this.loadTransactions(); }
  }
  txPrevPage(): void {
    if (this.txPage > 1) { this.txPage--; this.loadTransactions(); }
  }

  // ── Charts ───────────────────────────────────────────────────────
  private buildAreaOptions(): any {
    return {
      chart: { type: 'area', height: 280, fontFamily: 'inherit', toolbar: { show: false }, animations: { enabled: true, speed: 400 } },
      colors: ['#10b981', '#ef4444'],
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02 } },
      dataLabels: { enabled: false },
      xaxis: { categories: [], labels: { style: { fontSize: '10px', colors: '#6b7280' } } },
      yaxis: { labels: { style: { fontSize: '10px', colors: '#6b7280' }, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}` } },
      grid: { strokeDashArray: 4, borderColor: '#f3f4f6' },
      legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#6b7280' } },
      tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('ar-EG')} ج.م` } },
    };
  }

  private buildCharts(): void {
    this.trendSeries = [
      { name: 'داخل', data: this.trendData.map(d => d.total_in)  },
      { name: 'خارج', data: this.trendData.map(d => d.total_out) },
    ];
    this.trendOptions = {
      ...this.trendOptions,
      xaxis: { ...this.trendOptions.xaxis, categories: this.trendData.map(d => d.date) },
    };
  }

  // ── Getters ──────────────────────────────────────────────────────
  get filteredShopStats(): FinancialShopStat[] {
    const q = this.shopSearch.trim().toLowerCase();
    return q ? this.shopStats.filter(s => s.shop_name.toLowerCase().includes(q)) : this.shopStats;
  }

  get maxShopIn(): number {
    return Math.max(...this.shopStats.map(s => s.total_in), 1);
  }

  // ── Label helpers ─────────────────────────────────────────────────
  typeLabel(t: string): string {
    const map: Record<string, string> = {
      sale:             'مبيعات',
      refund:           'مرتجعات',
      admin_deposit:    'إيداع إداري',
      admin_withdrawal: 'سحب إداري',
      manager_deposit:  'إيداع مدير',
      manager_expense:  'مصاريف',
      transfer_in:      'تحويل وارد',
      transfer_out:     'تحويل صادر',
    };
    return map[t] ?? t;
  }

  typeBadgeClass(t: string): string {
    const map: Record<string, string> = {
      sale:             'bg-success-100  text-success-700  dark:bg-success-500/20  dark:text-success-300',
      refund:           'bg-error-100    text-error-700    dark:bg-error-500/20    dark:text-error-300',
      admin_deposit:    'bg-blue-100     text-blue-700     dark:bg-blue-500/20     dark:text-blue-300',
      admin_withdrawal: 'bg-orange-100   text-orange-700   dark:bg-orange-500/20   dark:text-orange-300',
      manager_deposit:  'bg-cyan-100     text-cyan-700     dark:bg-cyan-500/20     dark:text-cyan-300',
      manager_expense:  'bg-amber-100    text-amber-700    dark:bg-amber-500/20    dark:text-amber-300',
      transfer_in:      'bg-purple-100   text-purple-700   dark:bg-purple-500/20   dark:text-purple-300',
      transfer_out:     'bg-gray-100     text-gray-600     dark:bg-white/10        dark:text-gray-400',
    };
    return map[t] ?? 'bg-gray-100 text-gray-600';
  }

  directionClass(d: string): string {
    return d === 'in'
      ? 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300'
      : 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-300';
  }

  netFlowClass(val: number): string {
    return val >= 0
      ? 'text-success-600 dark:text-success-400'
      : 'text-error-600 dark:text-error-400';
  }
}
