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
import { InventoryAuditReportService, InventoryAuditReportData, InventoryAuditFilters } from '../../../services/inventory-audit-report.service';
import { ShopService } from '../../../services/shop.service';
import { ProductService } from '../../../services/product.service';
import { StockService } from '../../../services/stock.service';

/**
 * Phase 4.14 — Inventory Audit Report. Reuses StockMovementService's rows
 * (same source as 4.11/4.12/4.13) reframed as Old/New Quantity per
 * operation — no new movement query. See InventoryAuditReportController.
 */
@Component({
  selector: 'app-inventory-audit-report',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './inventory-audit-report.component.html',
})
export class InventoryAuditReportComponent implements OnInit {
  private auditSvc = inject(InventoryAuditReportService);
  private shopSvc = inject(ShopService);
  private productSvc = inject(ProductService);
  private stockSvc = inject(StockService);

  loading = false;
  errorMsg = '';
  report: InventoryAuditReportData | null = null;

  productId: number | null = null;
  supplierId: number | null = null;
  shopId: number | null = null;
  from = '';
  to = '';

  shops: { id: number; name: string }[] = [];
  products: { id: number; name: string; sku: string }[] = [];
  suppliers: { id: number; name: string }[] = [];

  get filters(): InventoryAuditFilters {
    return {
      product_id: this.productId ?? undefined, supplier_id: this.supplierId ?? undefined,
      shop_id: this.shopId ?? undefined, from: this.from || undefined, to: this.to || undefined,
    };
  }

  get exportParams(): Record<string, any> { return this.filters; }

  ngOnInit(): void {
    this.shopSvc.getShops({ per_page: 200 }).subscribe({ next: (res) => { this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });
    this.productSvc.getProducts({ per_page: 500, exclude_type: 'COMPOUND' }).subscribe({ next: (res) => { this.products = (res.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })); } });
    this.stockSvc.getSuppliers({ per_page: 200 }).subscribe({ next: (res) => { this.suppliers = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });
    this.load();
  }

  applyFilters(): void { this.load(); }
  clearRange(): void { this.from = ''; this.to = ''; this.applyFilters(); }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.auditSvc.data(this.filters).subscribe({
      next: (res) => { this.report = res; this.loading = false; },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل تقرير التدقيق على المخزون'; },
    });
  }
}
