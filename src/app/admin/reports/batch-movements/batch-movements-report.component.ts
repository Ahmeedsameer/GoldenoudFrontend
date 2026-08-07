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
import { BatchTraceabilityService, BatchMovementRow, BatchFilters } from '../../../services/batch-traceability.service';
import { ShopService } from '../../../services/shop.service';
import { ProductService } from '../../../services/product.service';

/**
 * Batch Movement History — every purchase/sale/transfer/waste/adjustment
 * event across every batch matching the filters (see
 * BatchTraceabilityController::movements(), the exact same 4 event sources
 * the single-batch traceability timeline already reads, just unioned).
 */
@Component({
  selector: 'app-batch-movements-report',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './batch-movements-report.component.html',
})
export class BatchMovementsReportComponent implements OnInit {
  private batchSvc = inject(BatchTraceabilityService);
  private shopSvc = inject(ShopService);
  private productSvc = inject(ProductService);

  loading = false;
  errorMsg = '';
  rows: BatchMovementRow[] = [];
  totalIn = 0;
  totalOut = 0;

  productId: number | null = null;
  shopId: number | null = null;
  from = '';
  to = '';
  typeFilter = '';

  shops: { id: number; name: string }[] = [];
  products: { id: number; name: string; sku: string }[] = [];

  types = [
    { value: '', label: 'كل الأنواع' },
    { value: 'purchase', label: 'شراء' },
    { value: 'sale', label: 'بيع' },
    { value: 'transfer_out', label: 'نقل صادر' },
    { value: 'transfer_in', label: 'نقل وارد' },
    { value: 'waste', label: 'هالك' },
    { value: 'adjustment', label: 'تسوية مخزون' },
  ];

  get filters(): BatchFilters {
    return {
      product_id: this.productId ?? undefined, shop_id: this.shopId ?? undefined,
      from: this.from || undefined, to: this.to || undefined,
    };
  }

  get exportParams(): Record<string, any> { return this.filters; }

  get displayRows(): BatchMovementRow[] {
    return this.typeFilter ? this.rows.filter((r) => r.type === this.typeFilter) : this.rows;
  }

  ngOnInit(): void {
    this.shopSvc.getShops({ per_page: 200 }).subscribe({ next: (res) => { this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });
    this.productSvc.getProducts({ per_page: 500, exclude_type: 'COMPOUND' }).subscribe({ next: (res) => { this.products = (res.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })); } });
    this.load();
  }

  applyFilters(): void { this.load(); }
  clearRange(): void { this.from = ''; this.to = ''; this.applyFilters(); }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.batchSvc.movements({ ...this.filters, limit: 300 }).subscribe({
      next: (res) => { this.rows = res.rows; this.totalIn = res.total_in; this.totalOut = res.total_out; this.loading = false; },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل سجل حركة الدفعات'; },
    });
  }
}
