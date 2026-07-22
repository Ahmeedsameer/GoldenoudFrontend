import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LoadingComponent } from '../../../loading/loading.component';
import {
  ProductDetailService, ProductSummary, PurchaseHistoryRow, MovementRow, SupplierHistoryRow, ProductAnalytics,
} from '../../../services/product-detail.service';
import { PricingService, PriceHistoryRow } from '../../../services/pricing.service';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';

/**
 * The single professional profile screen for a product — general info,
 * inventory, purchase/price/movement history, sales, suppliers, and trend
 * charts, all read-only aggregates over existing Purchasing/Sales/Pricing
 * data. Compound Products (virtual, no stock) get a different layout:
 * sales + most-used oils/bottles instead of inventory/purchase sections.
 */
@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, RouterLink, LoadingComponent, NgApexchartsModule, ReportToolbarComponent],
  templateUrl: './product-detail.component.html',
})
export class ProductDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(ProductDetailService);
  private pricingSvc = inject(PricingService);

  productId!: number;
  loading = false;
  summary: ProductSummary | null = null;

  get isCompound(): boolean {
    return this.summary?.general.product_type === 'COMPOUND';
  }

  typeLabel(t: string): string {
    return { RAW_MATERIAL: 'مادة خام', PACKAGING: 'مستلزمات تعبئة', READY_PRODUCT: 'منتج جاهز', COMPOUND: 'عطر مركّب' }[t] || t;
  }

  // ── Purchase history ──────────────────────────────────────────────────
  purchaseRows: PurchaseHistoryRow[] = [];
  purchasePage = 1; purchaseLastPage = 1; purchaseLoading = false;
  purchaseSearch = ''; purchaseSort = 'date'; purchaseDirection: 'asc' | 'desc' = 'desc';

  // ── Price history ─────────────────────────────────────────────────────
  priceRows: PriceHistoryRow[] = [];
  pricePage = 1; priceLastPage = 1; priceLoading = false;

  // ── Movements ──────────────────────────────────────────────────────────
  movementRows: MovementRow[] = [];
  movementPage = 1; movementLastPage = 1; movementLoading = false;

  // ── Supplier history ───────────────────────────────────────────────────
  supplierRows: SupplierHistoryRow[] = [];

  // ── Analytics charts ───────────────────────────────────────────────────
  analytics: ProductAnalytics | null = null;
  trendSeries: any[] = [];
  trendOptions: any = {
    chart: { type: 'line', height: 260, fontFamily: 'inherit', toolbar: { show: false } },
    colors: ['#465fff', '#16a34a'],
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    xaxis: { categories: [], labels: { style: { fontSize: '10px', colors: '#6b7280' } } },
    yaxis: { labels: { style: { fontSize: '10px', colors: '#6b7280' } } },
    grid: { strokeDashArray: 4, borderColor: '#f3f4f6' },
    legend: { fontSize: '11px' },
  };

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.svc.summary(this.productId).subscribe({
      next: (s) => {
        this.summary = s;
        this.loading = false;
        this.loadAnalytics();
        if (!this.isCompound) {
          this.loadPurchaseHistory();
          this.loadMovements();
          this.loadSupplierHistory();
        }
        this.loadPriceHistory();
      },
      error: () => { this.loading = false; },
    });
  }

  loadPurchaseHistory(page = 1): void {
    this.purchaseLoading = true;
    this.svc.purchaseHistory(this.productId, {
      page, per_page: 10, search: this.purchaseSearch || undefined, sort: this.purchaseSort, direction: this.purchaseDirection,
    }).subscribe({
      next: (res) => {
        this.purchaseRows = res.data; this.purchasePage = res.current_page; this.purchaseLastPage = res.last_page;
        this.purchaseLoading = false;
      },
      error: () => { this.purchaseLoading = false; },
    });
  }

  setPurchaseSort(col: string): void {
    if (this.purchaseSort === col) {
      this.purchaseDirection = this.purchaseDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.purchaseSort = col; this.purchaseDirection = 'desc';
    }
    this.loadPurchaseHistory(1);
  }

  onPurchaseSearch(value: string): void {
    this.purchaseSearch = value;
    this.loadPurchaseHistory(1);
  }

  get purchaseExportParams(): Record<string, any> {
    return { search: this.purchaseSearch, sort: this.purchaseSort, direction: this.purchaseDirection };
  }

  loadPriceHistory(page = 1): void {
    // Only Ready/Compound products go through Pricing Management — raw
    // materials/packaging simply have no price history to show.
    if (!['READY_PRODUCT', 'COMPOUND'].includes(this.summary?.general.product_type || '')) return;
    this.priceLoading = true;
    this.pricingSvc.history(this.productId, page).subscribe({
      next: (res) => {
        this.priceRows = res.data; this.pricePage = res.meta.current_page; this.priceLastPage = res.meta.last_page;
        this.priceLoading = false;
      },
      error: () => { this.priceLoading = false; },
    });
  }

  loadMovements(page = 1): void {
    this.movementLoading = true;
    this.svc.movements(this.productId, page).subscribe({
      next: (res) => {
        this.movementRows = res.data; this.movementPage = res.current_page; this.movementLastPage = res.last_page;
        this.movementLoading = false;
      },
      error: () => { this.movementLoading = false; },
    });
  }

  loadSupplierHistory(): void {
    this.svc.supplierHistory(this.productId).subscribe({ next: (rows) => { this.supplierRows = rows; }, error: () => {} });
  }

  loadAnalytics(): void {
    this.svc.analytics(this.productId).subscribe({
      next: (a) => {
        this.analytics = a;
        const series: any[] = [];
        let categories: string[] = [];
        if (a.purchase_trend.length) {
          series.push({ name: 'المشتريات (كمية)', data: a.purchase_trend.map((p) => p.qty) });
          categories = a.purchase_trend.map((p) => p.month);
        }
        if (a.sales_trend.length) {
          series.push({ name: 'المبيعات (كمية)', data: a.sales_trend.map((p) => p.qty) });
          if (!categories.length) categories = a.sales_trend.map((p) => p.month);
        }
        this.trendSeries = series;
        this.trendOptions = { ...this.trendOptions, xaxis: { ...this.trendOptions.xaxis, categories } };
      },
      error: () => {},
    });
  }
}
