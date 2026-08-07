import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportKpiCardComponent } from '../../../shared/components/reports/report-kpi-card/report-kpi-card.component';
import { ReportLoadingSkeletonComponent } from '../../../shared/components/reports/report-loading-skeleton/report-loading-skeleton.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import { SearchBarComponent } from '../../../shared/components/common/search-bar/search-bar.component';
import { BatchTraceabilityService, BatchRow, BatchFilters } from '../../../services/batch-traceability.service';
import { ShopService } from '../../../services/shop.service';
import { ProductService } from '../../../services/product.service';
import { StockService } from '../../../services/stock.service';

/**
 * Profit by Batch / Sales by Batch — one shared component (mode from route
 * `data.mode`) reusing BatchTraceabilityController's own index() endpoint
 * with `sort=profit`/`sort=sold`, so nothing is recomputed: revenue/profit
 * always come from InvoiceItem's frozen line_cost/line_profit snapshots
 * (the exact FIFO batch consumed at sale time), never live prices.
 */
@Component({
  selector: 'app-batch-ranking-report',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportToolbarComponent, DatePickerComponent, SearchBarComponent],
  templateUrl: './batch-ranking-report.component.html',
})
export class BatchRankingReportComponent implements OnInit {
  private batchSvc = inject(BatchTraceabilityService);
  private shopSvc = inject(ShopService);
  private productSvc = inject(ProductService);
  private stockSvc = inject(StockService);
  private route = inject(ActivatedRoute);

  mode: 'profit' | 'sales' = 'profit';

  loading = false;
  errorMsg = '';
  rows: BatchRow[] = [];
  meta = { current_page: 1, last_page: 1, total: 0, per_page: 20 };

  productId: number | null = null;
  supplierId: number | null = null;
  shopId: number | null = null;
  from = '';
  to = '';
  search = '';

  shops: { id: number; name: string }[] = [];
  products: { id: number; name: string; sku: string }[] = [];
  suppliers: { id: number; name: string }[] = [];

  get title(): string {
    return this.mode === 'profit' ? 'الربح حسب الدفعة' : 'المبيعات حسب الدفعة';
  }

  get subtitle(): string {
    return this.mode === 'profit'
      ? 'أعلى الدُفعات ربحاً — من لقطات الفاتورة المجمّدة عند البيع، وليس من أسعار حية'
      : 'أعلى الدُفعات مبيعاً — الكمية المباعة الفعلية من كل دفعة';
  }

  get exportPath(): string {
    return '/branch-operations/reports/batches/export';
  }

  get filters(): BatchFilters {
    return {
      product_id: this.productId ?? undefined, supplier_id: this.supplierId ?? undefined,
      shop_id: this.shopId ?? undefined, from: this.from || undefined, to: this.to || undefined,
      search: this.search || undefined, sort: this.mode === 'profit' ? 'profit' : 'sold',
    };
  }

  get exportParams(): Record<string, any> { return this.filters; }

  get totalRevenue(): number { return this.rows.reduce((s, r) => s + (r.revenue || 0), 0); }
  get totalProfit(): number { return this.rows.reduce((s, r) => s + (r.gross_profit || 0), 0); }
  get totalSold(): number { return this.rows.reduce((s, r) => s + (r.sold_quantity || 0), 0); }

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] as 'profit' | 'sales') ?? 'profit';
    this.shopSvc.getShops({ per_page: 200 }).subscribe({ next: (res) => { this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });
    this.productSvc.getProducts({ per_page: 500, exclude_type: 'COMPOUND' }).subscribe({ next: (res) => { this.products = (res.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })); } });
    this.stockSvc.getSuppliers({ per_page: 200 }).subscribe({ next: (res) => { this.suppliers = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });
    this.load();
  }

  applyFilters(): void { this.load(1); }
  clearRange(): void { this.from = ''; this.to = ''; this.applyFilters(); }

  load(page = 1): void {
    this.loading = true;
    this.errorMsg = '';
    this.batchSvc.list({ ...this.filters, page, per_page: this.meta.per_page }).subscribe({
      next: (res) => { this.rows = res.rows; this.meta = res.meta; this.loading = false; },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل التقرير'; },
    });
  }

  goToPage(page: number): void { if (page >= 1 && page <= this.meta.last_page) this.load(page); }
}
