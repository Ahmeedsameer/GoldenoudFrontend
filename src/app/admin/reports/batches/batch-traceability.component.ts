import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportKpiCardComponent } from '../../../shared/components/reports/report-kpi-card/report-kpi-card.component';
import { ReportLoadingSkeletonComponent } from '../../../shared/components/reports/report-loading-skeleton/report-loading-skeleton.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import {
  BatchTraceabilityService, BatchRow, BatchSummary, BatchDetailData, BatchFilters,
} from '../../../services/batch-traceability.service';
import { ShopService } from '../../../services/shop.service';
import { ProductService } from '../../../services/product.service';
import { StockService } from '../../../services/stock.service';

/**
 * Phase 4.13 — FIFO / Batch Traceability. A "batch" = one SupplyItem (one
 * purchased lot). No inventory logic is duplicated: consumption is read back
 * from the same *_batches link tables Waste/Transfer/Adjustment already
 * write to (see BatchTraceabilityController). Clicking a batch loads its
 * full lifecycle timeline.
 */
@Component({
  selector: 'app-batch-traceability',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './batch-traceability.component.html',
})
export class BatchTraceabilityComponent implements OnInit {
  private batchSvc = inject(BatchTraceabilityService);
  private shopSvc = inject(ShopService);
  private productSvc = inject(ProductService);
  private stockSvc = inject(StockService);

  loading = false;
  loadingDetail = false;
  errorMsg = '';

  rows: BatchRow[] = [];
  meta = { current_page: 1, last_page: 1, total: 0, per_page: 20 };
  summary: BatchSummary | null = null;

  productId: number | null = null;
  supplierId: number | null = null;
  shopId: number | null = null;
  from = '';
  to = '';
  search = '';

  shops: { id: number; name: string }[] = [];
  products: { id: number; name: string; sku: string }[] = [];
  suppliers: { id: number; name: string }[] = [];

  selectedBatch: BatchDetailData | null = null;

  get filters(): BatchFilters {
    return {
      product_id: this.productId ?? undefined, supplier_id: this.supplierId ?? undefined,
      shop_id: this.shopId ?? undefined, from: this.from || undefined, to: this.to || undefined,
      search: this.search || undefined,
    };
  }

  get exportParams(): Record<string, any> { return this.filters; }

  ngOnInit(): void {
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
    this.selectedBatch = null;
    this.batchSvc.list({ ...this.filters, page, per_page: this.meta.per_page }).subscribe({
      next: (res) => { this.rows = res.rows; this.meta = res.meta; this.loading = false; },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل دفعات المخزون'; },
    });
    this.batchSvc.summary(this.filters).subscribe({ next: (res) => { this.summary = res; } });
  }

  goToPage(page: number): void { if (page >= 1 && page <= this.meta.last_page) this.load(page); }

  openBatch(id: number): void {
    this.loadingDetail = true;
    this.selectedBatch = null;
    this.batchSvc.show(id).subscribe({
      next: (res) => { this.selectedBatch = res; this.loadingDetail = false; },
      error: () => { this.loadingDetail = false; this.errorMsg = 'فشل تحميل تفاصيل الدفعة'; },
    });
  }

  closeBatch(): void { this.selectedBatch = null; }
}
