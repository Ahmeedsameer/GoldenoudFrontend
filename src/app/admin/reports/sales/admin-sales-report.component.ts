import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  AdminSalesReportService,
  AdminSalesSummary,
  AdminSalesTrend,
  AdminShopStat,
  AdminSellerStat,
  AdminProductStat,
  AdminCategoryStat,
  AdminCustomerSummary,
  AdminTopCustomer,
  AdminHourlyPoint,
  AdminInvoiceRow,
  AdminInvoicePage,
  ReportPeriod,
} from '../../../services/admin-sales-report.service';
import { ShopService } from '../../../services/shop.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';

interface PeriodOption { key: ReportPeriod; label: string; }

@Component({
  selector: 'app-admin-sales-report',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule, LoadingComponent, AlertComponent],
  templateUrl: './admin-sales-report.component.html',
})
export class AdminSalesReportComponent implements OnInit {
  private svc  = inject(AdminSalesReportService);
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

  // ── Main report data ─────────────────────────────────────────────
  summary:       AdminSalesSummary | null = null;
  trendData:     AdminSalesTrend[]        = [];
  shopStats:     AdminShopStat[]          = [];
  sellerStats:   AdminSellerStat[]        = [];
  productStats:  AdminProductStat[]       = [];
  categoryStats: AdminCategoryStat[]      = [];
  customerData:  AdminCustomerSummary | null = null;
  hourlyData:    AdminHourlyPoint[]       = [];

  // ── Invoice list ─────────────────────────────────────────────────
  invoicesLoading   = false;
  invoices:         AdminInvoiceRow[] = [];
  invoiceMeta:      Omit<AdminInvoicePage, 'data'> | null = null;

  invoicePage           = 1;
  invoiceStatus         = '';
  invoiceSellerId:      number | null = null;
  invoiceMinAmount:     number | null = null;
  invoiceMaxAmount:     number | null = null;
  invoiceCustomerSearch = '';

  // ── Search / pagination ──────────────────────────────────────────
  readonly pageSize = 20;

  sellersSearch   = '';  sellersPage   = 1;
  productsSearch  = '';  productsPage  = 1;
  customersSearch = '';  customersPage = 1;

  // ── Charts ───────────────────────────────────────────────────────
  trendSeries:  any[] = [];
  trendOptions: any   = this.buildBarOptions('الإيرادات اليومية (ج.م)', '#465fff');

  hourlySeries:  any[] = [];
  hourlyOptions: any   = this.buildBarOptions('إيرادات الساعة (ج.م)', '#10b981');

  shopChartSeries:  any[] = [];
  shopChartOptions: any   = this.buildBarOptions('إيرادات الفروع (ج.م)', '#f59e0b');

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
    this.period           = p;
    this.customRangeActive = false;
    this.globalFrom       = '';
    this.globalTo         = '';
    this.showCustomPicker = false;
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

  // ── Main load ────────────────────────────────────────────────────
  private load(): void {
    this.loading  = true;
    this.errorMsg = '';
    const [from, to] = this.dateRange();
    const sid = this.selectedShopId;

    forkJoin({
      summary:   this.svc.getSummary(this.period, from, to, sid),
      trend:     this.svc.getTrend(this.period, from, to, sid),
      byShop:    this.svc.getByShop(this.period, from, to),
      bySeller:  this.svc.getBySeller(this.period, from, to, sid),
      byProduct: this.svc.getByProduct(this.period, from, to, sid),
      byCategory:this.svc.getByCategory(this.period, from, to, sid),
      customers: this.svc.getCustomers(this.period, from, to, sid),
      hourly:    this.svc.getHourly(this.period, from, to, sid),
    }).subscribe({
      next: ({ summary, trend, byShop, bySeller, byProduct, byCategory, customers, hourly }) => {
        this.summary       = summary;
        this.trendData     = trend;
        this.shopStats     = byShop;
        this.sellerStats   = bySeller;
        this.productStats  = byProduct;
        this.categoryStats = byCategory;
        this.customerData  = customers;
        this.hourlyData    = hourly;
        this.loading       = false;
        this.buildCharts();
        // Reset invoice filters and reload
        this.invoicePage = 1;
        this.loadInvoices();
      },
      error: () => {
        this.loading  = false;
        this.errorMsg = 'فشل تحميل بيانات التقرير. يرجى المحاولة مرة أخرى.';
      },
    });
  }

  reload(): void {
    this.sellersPage   = 1;
    this.productsPage  = 1;
    this.customersPage = 1;
    this.invoicePage   = 1;
    this.load();
  }

  // ── Invoice list ─────────────────────────────────────────────────
  loadInvoices(): void {
    this.invoicesLoading = true;
    const [from, to] = this.dateRange();
    this.svc.getInvoices(this.period, from, to, {
      shop_id:    this.selectedShopId,
      seller_id:  this.invoiceSellerId,
      status:     this.invoiceStatus  || undefined,
      min_amount: this.invoiceMinAmount ?? undefined,
      max_amount: this.invoiceMaxAmount ?? undefined,
      customer:   this.invoiceCustomerSearch || undefined,
      page:       this.invoicePage,
      per_page:   25,
    }).subscribe({
      next: (page) => {
        this.invoices        = page.data;
        this.invoiceMeta     = { current_page: page.current_page, last_page: page.last_page, total: page.total, per_page: page.per_page };
        this.invoicesLoading = false;
      },
      error: () => { this.invoicesLoading = false; },
    });
  }

  applyInvoiceFilters(): void {
    this.invoicePage = 1;
    this.loadInvoices();
  }

  resetInvoiceFilters(): void {
    this.invoiceStatus         = '';
    this.invoiceSellerId       = null;
    this.invoiceMinAmount      = null;
    this.invoiceMaxAmount      = null;
    this.invoiceCustomerSearch = '';
    this.invoicePage           = 1;
    this.loadInvoices();
  }

  invoiceNextPage(): void {
    if (this.invoiceMeta && this.invoicePage < this.invoiceMeta.last_page) {
      this.invoicePage++;
      this.loadInvoices();
    }
  }

  invoicePrevPage(): void {
    if (this.invoicePage > 1) {
      this.invoicePage--;
      this.loadInvoices();
    }
  }

  // ── Charts ───────────────────────────────────────────────────────
  private buildBarOptions(tooltipLabel: string, color: string): any {
    return {
      chart: { type: 'bar', height: 240, fontFamily: 'inherit', toolbar: { show: false }, animations: { enabled: true, speed: 400 } },
      colors: [color],
      plotOptions: { bar: { columnWidth: '60%', borderRadius: 3 } },
      dataLabels: { enabled: false },
      xaxis: { categories: [], labels: { style: { fontSize: '10px', colors: '#6b7280' } } },
      yaxis: { labels: { style: { fontSize: '10px', colors: '#6b7280' }, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}` } },
      grid: { strokeDashArray: 4, borderColor: '#f3f4f6' },
      tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('ar-EG')} ج.م` } },
    };
  }

  private buildCharts(): void {
    // Revenue trend
    this.trendSeries  = [{ name: 'الإيرادات', data: this.trendData.map(d => d.revenue) }];
    this.trendOptions = { ...this.trendOptions, xaxis: { ...this.trendOptions.xaxis, categories: this.trendData.map(d => d.date) } };

    // Hourly
    this.hourlySeries  = [{ name: 'الإيرادات', data: this.hourlyData.map(d => d.revenue) }];
    this.hourlyOptions = {
      ...this.hourlyOptions,
      xaxis: {
        ...this.hourlyOptions.xaxis,
        categories: this.hourlyData.map(d => `${String(d.hour).padStart(2, '0')}:00`),
        tickAmount: 12,
      },
      tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('ar-EG')} ج.م` }, x: { formatter: (v: string) => `الساعة ${v}` } },
    };

    // Shop chart (top 10)
    const top10 = this.shopStats.slice(0, 10);
    this.shopChartSeries  = [{ name: 'الإيرادات', data: top10.map(s => s.total_revenue) }];
    this.shopChartOptions = {
      ...this.shopChartOptions,
      xaxis: { ...this.shopChartOptions.xaxis, categories: top10.map(s => s.shop_name) },
    };
  }

  // ── Filtered / paginated getters ─────────────────────────────────

  get filteredSellers(): AdminSellerStat[] {
    const q = this.sellersSearch.trim().toLowerCase();
    return q ? this.sellerStats.filter(s => s.seller_name.toLowerCase().includes(q) || s.shop_name.toLowerCase().includes(q)) : this.sellerStats;
  }
  get paginatedSellers(): AdminSellerStat[] {
    const start = (this.sellersPage - 1) * this.pageSize;
    return this.filteredSellers.slice(start, start + this.pageSize);
  }
  get sellersPageCount(): number { return Math.ceil(this.filteredSellers.length / this.pageSize); }
  onSellersSearchChange(): void  { this.sellersPage = 1; }

  get filteredProducts(): AdminProductStat[] {
    const q = this.productsSearch.trim().toLowerCase();
    return q ? this.productStats.filter(p => p.product_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category_name.toLowerCase().includes(q)) : this.productStats;
  }
  get paginatedProducts(): AdminProductStat[] {
    const start = (this.productsPage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }
  get productsPageCount(): number { return Math.ceil(this.filteredProducts.length / this.pageSize); }
  onProductsSearchChange(): void  { this.productsPage = 1; }

  get filteredCustomers(): AdminTopCustomer[] {
    const customers = this.customerData?.top_customers ?? [];
    const q = this.customersSearch.trim().toLowerCase();
    return q ? customers.filter(c => c.customer_name.toLowerCase().includes(q) || c.customer_phone.includes(q)) : customers;
  }
  get paginatedCustomers(): AdminTopCustomer[] {
    const start = (this.customersPage - 1) * this.pageSize;
    return this.filteredCustomers.slice(start, start + this.pageSize);
  }
  get customersPageCount(): number { return Math.ceil(this.filteredCustomers.length / this.pageSize); }
  onCustomersSearchChange(): void  { this.customersPage = 1; }

  // ── Share helpers ────────────────────────────────────────────────
  totalProductRevenue(): number { return this.productStats.reduce((s, p) => s + p.total_revenue, 0); }

  // ── Rank badge ───────────────────────────────────────────────────
  rankBadgeClass(rank: number): string {
    if (rank === 0) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
    if (rank === 1) return 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300';
    if (rank === 2) return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
    return 'bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-gray-500';
  }

  // ── Status helpers ───────────────────────────────────────────────
  statusLabel(s: string): string {
    return s === 'approved' ? 'مقبولة' : s === 'pending' ? 'معلقة' : s;
  }
  statusClass(s: string): string {
    return s === 'approved'
      ? 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
  }

  // ── Page-end helper ──────────────────────────────────────────────
  pageEnd(page: number, total: number): number {
    return Math.min(page * this.pageSize, total);
  }
}
