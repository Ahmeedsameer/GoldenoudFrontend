import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ReportsService,
  ReportPeriod,
  SalesSummary,
  SellerStat,
  ProductStat,
  InventoryGood,
  SalesTrendPoint,
  InventoryMovement,
  CustomerSummary,
  TopCustomer,
  FinancialSummary,
} from '../../services/reports.service';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';

interface PeriodOption { key: ReportPeriod; label: string; }

type TabKey = 'sales' | 'inventory' | 'customers' | 'financial';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, NgApexchartsModule],
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  private reportsService = inject(ReportsService);

  // ── Period ───────────────────────────────────────────────────────
  period: ReportPeriod = 'month';
  periods: PeriodOption[] = [
    { key: 'today', label: 'اليوم'   },
    { key: 'week',  label: 'الأسبوع' },
    { key: 'month', label: 'الشهر'   },
    { key: 'year',  label: 'السنة'   },
  ];

  // Global custom date range (overrides period for all tabs)
  showCustomPicker = false;
  globalFrom = '';
  globalTo   = '';
  /** True when a custom range is actively applied (not just typed). */
  customRangeActive = false;

  // ── Tabs ─────────────────────────────────────────────────────────
  activeTab: TabKey = 'sales';

  tabs: { key: TabKey; label: string }[] = [
    { key: 'sales',     label: 'المبيعات' },
    { key: 'inventory', label: 'المخزون'  },
    { key: 'customers', label: 'العملاء'  },
    { key: 'financial', label: 'المالية'  },
  ];

  // ── Loading / error ───────────────────────────────────────────────
  loading  = false;
  errorMsg = '';

  // ── Sales tab data ────────────────────────────────────────────────
  summary:   SalesSummary | null = null;
  sellers:   SellerStat[]        = [];
  products:  ProductStat[]       = [];
  trendData: SalesTrendPoint[]   = [];
  salesLoaded = false;

  // ── Inventory tab data ────────────────────────────────────────────
  inventory:       InventoryGood[]     = [];
  movements:       InventoryMovement[] = [];
  inventoryLoaded  = false;

  // Inventory sub-tabs
  inventorySubTab: 'snapshot' | 'movements' = 'snapshot';

  // Search
  snapshotSearch  = '';
  movementsSearch = '';

  // Custom date range (movements only)
  customFrom = '';
  customTo   = '';
  movementsDateLabel = '';   // shown as badge when a custom range is active

  // Pagination
  readonly pageSize = 20;
  snapshotPage  = 1;
  movementsPage = 1;
  sellersPage   = 1;
  customersPage = 1;

  // Search — sellers & customers
  sellersSearch   = '';
  customersSearch = '';

  // ── Customers tab data ────────────────────────────────────────────
  customerData:    CustomerSummary | null = null;
  customersLoaded  = false;

  // ── Financial tab data ────────────────────────────────────────────
  financialData:   FinancialSummary | null = null;
  financialLoaded  = false;

  // ── Chart options ─────────────────────────────────────────────────
  chartSeries: any[] = [];
  chartOptions: any  = {
    chart: {
      type: 'bar',
      height: 250,
      fontFamily: 'inherit',
      toolbar: { show: false },
      animations: { enabled: true, speed: 400 },
    },
    colors: ['#465fff'],
    plotOptions: {
      bar: { columnWidth: '55%', borderRadius: 3 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: [],
      tickAmount: 7,
      labels: { style: { fontSize: '11px', colors: '#6b7280' } },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#6b7280' },
        formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`,
      },
    },
    grid: { strokeDashArray: 4, borderColor: '#f3f4f6' },
    tooltip: {
      y: { formatter: (v: number) => `${v.toLocaleString('ar-EG')} ج.م` },
    },
  };

  // ── Lifecycle ─────────────────────────────────────────────────────
  ngOnInit(): void { this.loadSales(); }

  // ── Tab switch ────────────────────────────────────────────────────
  setTab(tab: TabKey): void {
    this.activeTab = tab;
    if (tab === 'sales'     && !this.salesLoaded)     { this.loadSales();     return; }
    if (tab === 'inventory' && !this.inventoryLoaded) { this.loadInventory(); return; }
    if (tab === 'customers' && !this.customersLoaded) { this.loadCustomers(); return; }
    if (tab === 'financial' && !this.financialLoaded) { this.loadFinancial(); return; }
  }

  // ── Period switch ─────────────────────────────────────────────────
  setPeriod(p: ReportPeriod): void {
    this.period           = p;
    // Selecting a preset clears any custom range
    this.customRangeActive = false;
    this.globalFrom        = '';
    this.globalTo          = '';
    this.showCustomPicker  = false;
    this.reloadActiveTab();
  }

  // ── Global custom date range ──────────────────────────────────────
  applyGlobalRange(): void {
    if (!this.globalFrom || !this.globalTo) return;
    this.customRangeActive = true;
    this.reloadActiveTab();
  }

  clearGlobalRange(): void {
    this.globalFrom        = '';
    this.globalTo          = '';
    this.customRangeActive = false;
    this.showCustomPicker  = false;
    this.reloadActiveTab();
  }

  private reloadActiveTab(): void {
    this.salesLoaded     = false;
    this.inventoryLoaded = false;
    this.customersLoaded = false;
    this.financialLoaded = false;
    // Reset list pages so stale offsets don't survive period changes
    this.sellersPage   = 1;
    this.customersPage = 1;
    if (this.activeTab === 'sales')     { this.loadSales();     }
    if (this.activeTab === 'inventory') { this.loadInventory(); }
    if (this.activeTab === 'customers') { this.loadCustomers(); }
    if (this.activeTab === 'financial') { this.loadFinancial(); }
  }

  /** Returns [from, to] to pass to service calls: custom range if active, else undefined. */
  private dateRange(): [string | undefined, string | undefined] {
    if (this.customRangeActive && this.globalFrom && this.globalTo) {
      return [this.globalFrom, this.globalTo];
    }
    return [undefined, undefined];
  }

  // ── Load methods ──────────────────────────────────────────────────
  private loadSales(): void {
    this.loading  = true;
    this.errorMsg = '';
    const [from, to] = this.dateRange();
    forkJoin({
      summary:  this.reportsService.getSalesSummary(this.period, from, to),
      sellers:  this.reportsService.getSellerPerformance(this.period, from, to),
      products: this.reportsService.getTopProducts(this.period, from, to),
      trend:    this.reportsService.getSalesTrend(this.period, from, to),
    }).subscribe({
      next: ({ summary, sellers, products, trend }) => {
        this.summary   = summary;
        this.sellers   = sellers;
        this.products  = products;
        this.trendData = trend;
        this.salesLoaded = true;
        this.loading     = false;
        this.buildChart();
      },
      error: () => {
        this.loading  = false;
        this.errorMsg = 'فشل تحميل بيانات المبيعات. يرجى المحاولة مرة أخرى.';
      },
    });
  }

  private loadInventory(explicitFrom?: string, explicitTo?: string): void {
    this.loading  = true;
    this.errorMsg = '';
    this.snapshotPage  = 1;
    this.movementsPage = 1;
    // Movements-specific dates > global custom range > period preset
    const [globalFrom, globalTo] = this.dateRange();
    const from = explicitFrom ?? globalFrom;
    const to   = explicitTo   ?? globalTo;
    forkJoin({
      snapshot:  this.reportsService.getInventoryStatus(),
      movements: this.reportsService.getInventoryMovements(this.period, from, to),
    }).subscribe({
      next: ({ snapshot, movements }) => {
        this.inventory       = snapshot;
        this.movements       = movements;
        this.inventoryLoaded = true;
        this.loading         = false;
      },
      error: () => {
        this.loading  = false;
        this.errorMsg = 'فشل تحميل بيانات المخزون. يرجى المحاولة مرة أخرى.';
      },
    });
  }

  /** Apply custom date range for movements and reload. */
  applyCustomDates(): void {
    if (!this.customFrom || !this.customTo) return;
    this.movementsDateLabel  = `${this.customFrom} — ${this.customTo}`;
    this.inventoryLoaded     = false;
    this.loadInventory(this.customFrom, this.customTo);
  }

  /** Reset custom dates back to the active period preset. */
  resetCustomDates(): void {
    this.customFrom         = '';
    this.customTo           = '';
    this.movementsDateLabel = '';
    this.inventoryLoaded    = false;
    this.loadInventory();
  }

  private loadCustomers(): void {
    this.loading  = true;
    this.errorMsg = '';
    const [from, to] = this.dateRange();
    this.reportsService.getTopCustomers(this.period, from, to).subscribe({
      next: (data) => {
        this.customerData    = data;
        this.customersLoaded = true;
        this.loading         = false;
      },
      error: () => {
        this.loading  = false;
        this.errorMsg = 'فشل تحميل بيانات العملاء. يرجى المحاولة مرة أخرى.';
      },
    });
  }

  private loadFinancial(): void {
    this.loading  = true;
    this.errorMsg = '';
    const [from, to] = this.dateRange();
    this.reportsService.getFinancialSummary(this.period, from, to).subscribe({
      next: (data) => {
        this.financialData   = data;
        this.financialLoaded = true;
        this.loading         = false;
      },
      error: () => {
        this.loading  = false;
        this.errorMsg = 'فشل تحميل البيانات المالية. يرجى المحاولة مرة أخرى.';
      },
    });
  }

  // ── Chart builder ──────────────────────────────────────────────────
  private buildChart(): void {
    this.chartSeries  = [{ name: 'الإيرادات (ج.م)', data: this.trendData.map(d => d.revenue) }];
    this.chartOptions = {
      ...this.chartOptions,
      xaxis: {
        ...this.chartOptions.xaxis,
        categories: this.trendData.map(d => d.date),
      },
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────
  stockLevel(qty: number): 'critical' | 'low' | 'ok' {
    if (qty <= 0)  return 'critical';
    if (qty <= 10) return 'low';
    return 'ok';
  }

  sellerShare(revenue: number): number {
    if (!this.summary?.total_revenue) return 0;
    return Math.round((revenue / this.summary.total_revenue) * 100);
  }

  productShare(revenue: number): number {
    const total = this.products.reduce((s, p) => s + p.total_revenue, 0);
    if (!total) return 0;
    return Math.round((revenue / total) * 100);
  }

  customerShare(spent: number): number {
    const total = this.customerData?.top_customers?.reduce((s, c) => s + c.total_spent, 0) ?? 0;
    if (!total) return 0;
    return Math.round((spent / total) * 100);
  }

  get inventoryLowCount(): number {
    return this.inventory.filter(g => this.stockLevel(g.current_quantity) !== 'ok').length;
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      sale:             'مبيعات',
      refund:           'مردودات',
      admin_deposit:    'إيداع إدارة',
      admin_withdrawal: 'سحب إدارة',
      manager_deposit:  'إيداع مدير',
      manager_expense:  'مصروفات',
      transfer_in:      'تحويل وارد',
      transfer_out:     'تحويل صادر',
    };
    return map[type] ?? type;
  }

  get incomeRows()  { return this.financialData?.transactions.filter(t => t.direction === 'in')  ?? []; }
  get expenseRows() { return this.financialData?.transactions.filter(t => t.direction === 'out') ?? []; }

  // ── Inventory: filtered + paginated ──────────────────────────────
  get filteredInventory(): InventoryGood[] {
    const q = this.snapshotSearch.trim().toLowerCase();
    if (!q) return this.inventory;
    return this.inventory.filter(g =>
      g.product_name.toLowerCase().includes(q) || g.sku.toLowerCase().includes(q)
    );
  }

  get paginatedInventory(): InventoryGood[] {
    const start = (this.snapshotPage - 1) * this.pageSize;
    return this.filteredInventory.slice(start, start + this.pageSize);
  }

  get inventoryPageCount(): number {
    return Math.ceil(this.filteredInventory.length / this.pageSize);
  }

  get filteredMovements(): InventoryMovement[] {
    const q = this.movementsSearch.trim().toLowerCase();
    if (!q) return this.movements;
    return this.movements.filter(m =>
      m.product_name.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q)
    );
  }

  get paginatedMovements(): InventoryMovement[] {
    const start = (this.movementsPage - 1) * this.pageSize;
    return this.filteredMovements.slice(start, start + this.pageSize);
  }

  get movementsPageCount(): number {
    return Math.ceil(this.filteredMovements.length / this.pageSize);
  }

  /** Reset page to 1 whenever search changes. */
  onSnapshotSearchChange(): void  { this.snapshotPage  = 1; }
  onMovementsSearchChange(): void { this.movementsPage = 1; }
  onSellersSearchChange(): void   { this.sellersPage   = 1; }
  onCustomersSearchChange(): void { this.customersPage = 1; }

  /** Safe display: last item index of current page. */
  pageEnd(page: number, total: number): number {
    return Math.min(page * this.pageSize, total);
  }

  // ── Sellers: filtered + paginated ────────────────────────────────
  get filteredSellers(): SellerStat[] {
    const q = this.sellersSearch.trim().toLowerCase();
    if (!q) return this.sellers;
    return this.sellers.filter(s => s.seller_name.toLowerCase().includes(q));
  }

  get paginatedSellers(): SellerStat[] {
    const start = (this.sellersPage - 1) * this.pageSize;
    return this.filteredSellers.slice(start, start + this.pageSize);
  }

  get sellersPageCount(): number {
    return Math.ceil(this.filteredSellers.length / this.pageSize);
  }

  // ── Customers: filtered + paginated ──────────────────────────────
  get filteredCustomers(): TopCustomer[] {
    const customers = this.customerData?.top_customers ?? [];
    const q = this.customersSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.customer_name.toLowerCase().includes(q) ||
      c.customer_phone.toLowerCase().includes(q)
    );
  }

  get paginatedCustomers(): TopCustomer[] {
    const start = (this.customersPage - 1) * this.pageSize;
    return this.filteredCustomers.slice(start, start + this.pageSize);
  }

  get customersPageCount(): number {
    return Math.ceil(this.filteredCustomers.length / this.pageSize);
  }

  /** Returns the correct Tailwind badge classes for a rank badge (0-based absolute rank). */
  rankBadgeClass(rank: number): string {
    if (rank === 0) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
    if (rank === 1) return 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300';
    if (rank === 2) return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
    return 'bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-gray-500';
  }

  printFinancial(): void { window.print(); }
}
