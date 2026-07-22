import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportKpiCardComponent } from '../../../shared/components/reports/report-kpi-card/report-kpi-card.component';
import { ReportLoadingSkeletonComponent } from '../../../shared/components/reports/report-loading-skeleton/report-loading-skeleton.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { ReportLineChartComponent } from '../../../shared/components/reports/report-charts/report-line-chart.component';
import { ReportBarChartComponent } from '../../../shared/components/reports/report-charts/report-bar-chart.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import { StockMovementReportService, StockMovementReportData } from '../../../services/stock-movement-report.service';
import { ProductDetailService, ProductSummary } from '../../../services/product-detail.service';
import { ShopService } from '../../../services/shop.service';
import { ProductService } from '../../../services/product.service';

/**
 * Phase 4.12 — Inventory Ledger: the chronological accounting ledger for
 * ONE product. Deliberately reuses the exact same backend endpoint as the
 * Stock Movement Report (4.11) — the ledger IS that report, scoped to a
 * single product_id — never a second query against the movement tables.
 * Product header info reuses ProductDetailService (already built in Phase 2).
 */
@Component({
  selector: 'app-inventory-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportLineChartComponent, ReportBarChartComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './inventory-ledger.component.html',
})
export class InventoryLedgerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private movementSvc = inject(StockMovementReportService);
  private productDetailSvc = inject(ProductDetailService);
  private shopSvc = inject(ShopService);
  private productSvc = inject(ProductService);

  loading = false;
  errorMsg = '';
  report: StockMovementReportData | null = null;
  product: ProductSummary | null = null;

  productId: number | null = null;
  from = '';
  to = '';
  shopId: number | null = null;

  shops: { id: number; name: string }[] = [];
  products: { id: number; name: string; sku: string }[] = [];

  balanceCategories: string[] = [];
  balanceSeries: { name: string; data: number[] }[] = [];
  dailyCategories: string[] = [];
  dailySeries: { name: string; data: number[] }[] = [];

  get exportParams(): Record<string, any> {
    return { product_id: this.productId ?? undefined, from: this.from || undefined, to: this.to || undefined, shop_id: this.shopId ?? undefined };
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const pid = qp.get('product_id') || this.route.snapshot.paramMap.get('productId');
    if (pid) { this.productId = +pid; }

    this.shopSvc.getShops({ per_page: 200 }).subscribe({ next: (res) => { this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });
    this.productSvc.getProducts({ per_page: 500, exclude_type: 'COMPOUND' }).subscribe({ next: (res) => { this.products = (res.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })); } });

    if (this.productId) { this.load(); }
  }

  setProduct(id: number | null): void {
    this.productId = id;
    if (id) { this.load(); } else { this.report = null; this.product = null; }
  }

  applyFilters(): void { if (this.productId) { this.load(); } }
  clearRange(): void { this.from = ''; this.to = ''; this.applyFilters(); }

  load(): void {
    if (!this.productId) return;
    this.loading = true;
    this.errorMsg = '';
    forkJoin({
      report: this.movementSvc.data(this.exportParams),
      product: this.productDetailSvc.summary(this.productId),
    }).subscribe({
      next: ({ report, product }) => {
        this.report = report;
        this.product = product;
        this.loading = false;
        this.buildCharts();
      },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل دفتر حساب المخزون'; },
    });
  }

  private buildCharts(): void {
    if (!this.report) return;
    this.balanceCategories = this.report.rows.map((r) => r.date.substring(0, 10));
    this.balanceSeries = [{ name: 'الرصيد الجاري', data: this.report.rows.map((r) => r.running_balance ?? 0) }];

    const c = this.report.charts.daily_movement;
    this.dailyCategories = c.map((d) => d.date);
    this.dailySeries = [{ name: 'وارد', data: c.map((d) => d.in) }, { name: 'صادر', data: c.map((d) => d.out) }];
  }

  get totalPurchased(): number { return this.report?.totals_by_type['purchase']?.quantity_in ?? 0; }
  get totalSold(): number { return this.report?.totals_by_type['sale']?.quantity_out ?? 0; }
  get totalTransferredIn(): number { return this.report?.totals_by_type['transfer_in']?.quantity_in ?? 0; }
  get totalTransferredOut(): number { return this.report?.totals_by_type['transfer_out']?.quantity_out ?? 0; }
  get totalWaste(): number { return this.report?.totals_by_type['waste']?.quantity_out ?? 0; }
  get totalAdjustments(): number {
    if (!this.report) return 0;
    const t = this.report.totals_by_type;
    const inQty = (t['adjustment_positive']?.quantity_in ?? 0) + (t['count_adjustment']?.quantity_in ?? 0);
    const outQty = (t['adjustment_negative']?.quantity_out ?? 0) + (t['count_adjustment']?.quantity_out ?? 0);
    return round(inQty - outQty);
  }
}

function round(n: number): number { return Math.round(n * 1000) / 1000; }
