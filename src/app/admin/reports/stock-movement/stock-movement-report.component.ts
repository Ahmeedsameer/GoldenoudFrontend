import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportKpiCardComponent } from '../../../shared/components/reports/report-kpi-card/report-kpi-card.component';
import { ReportLoadingSkeletonComponent } from '../../../shared/components/reports/report-loading-skeleton/report-loading-skeleton.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { ReportBarChartComponent } from '../../../shared/components/reports/report-charts/report-bar-chart.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import { StockMovementReportService, StockMovementReportData } from '../../../services/stock-movement-report.service';
import { ShopService } from '../../../services/shop.service';
import { ProductService } from '../../../services/product.service';
import { CategoryService } from '../../../services/category.service';
import { StockService } from '../../../services/stock.service';

/**
 * Phase 4.11 — Stock Movement Report. Every row comes from the same
 * StockMovementService the Inventory Ledger (4.12) and Inventory Audit
 * Report (4.14) use — one source of truth, three presentations.
 */
@Component({
  selector: 'app-stock-movement-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportBarChartComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './stock-movement-report.component.html',
})
export class StockMovementReportComponent implements OnInit {
  private svc = inject(StockMovementReportService);
  private route = inject(ActivatedRoute);
  private shopSvc = inject(ShopService);
  private productSvc = inject(ProductService);
  private categorySvc = inject(CategoryService);
  private stockSvc = inject(StockService);

  loading = false;
  errorMsg = '';
  report: StockMovementReportData | null = null;

  from = '';
  to = '';
  shopId: number | null = null;
  productId: number | null = null;
  categoryId: number | null = null;
  supplierId: number | null = null;

  shops: { id: number; name: string }[] = [];
  products: { id: number; name: string; sku: string }[] = [];
  categories: { id: number; name: string }[] = [];
  suppliers: { id: number; name: string }[] = [];

  dailyCategories: string[] = [];
  dailySeries: { name: string; data: number[] }[] = [];
  categoryCategories: string[] = [];
  categorySeries: { name: string; data: number[] }[] = [];
  branchCategories: string[] = [];
  branchSeries: { name: string; data: number[] }[] = [];

  get exportParams(): Record<string, any> {
    return {
      from: this.from || undefined, to: this.to || undefined, shop_id: this.shopId ?? undefined,
      product_id: this.productId ?? undefined, category_id: this.categoryId ?? undefined, supplier_id: this.supplierId ?? undefined,
    };
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const pid = qp.get('product_id');
    if (pid) { this.productId = +pid; }

    this.shopSvc.getShops({ per_page: 200 }).subscribe({ next: (res) => { this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });
    this.productSvc.getProducts({ per_page: 500 }).subscribe({ next: (res) => { this.products = (res.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })); } });
    this.categorySvc.getCategories({ per_page: 200 }).subscribe({ next: (res) => { this.categories = (res.data || []).map((c: any) => ({ id: c.id, name: c.name })); } });
    this.stockSvc.getSuppliers({ per_page: 200 }).subscribe({ next: (res) => { this.suppliers = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });

    this.load();
  }

  applyFilters(): void { this.load(); }
  clearRange(): void { this.from = ''; this.to = ''; this.load(); }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.svc.data(this.exportParams).subscribe({
      next: (r) => {
        this.report = r;
        this.loading = false;
        this.buildCharts();
      },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل تقرير حركة المخزون'; },
    });
  }

  private buildCharts(): void {
    if (!this.report) return;
    const c = this.report.charts;

    this.dailyCategories = c.daily_movement.map((d) => d.date);
    this.dailySeries = [{ name: 'وارد', data: c.daily_movement.map((d) => d.in) }, { name: 'صادر', data: c.daily_movement.map((d) => d.out) }];

    this.categoryCategories = c.by_category.map((d) => d.category);
    this.categorySeries = [{ name: 'وارد', data: c.by_category.map((d) => d.in) }, { name: 'صادر', data: c.by_category.map((d) => d.out) }];

    this.branchCategories = c.by_branch.map((d) => d.branch);
    this.branchSeries = [{ name: 'وارد', data: c.by_branch.map((d) => d.in) }, { name: 'صادر', data: c.by_branch.map((d) => d.out) }];
  }

  get totalsByTypeList(): { key: string; label: string; quantity_in: number; quantity_out: number }[] {
    if (!this.report) return [];
    return Object.entries(this.report.totals_by_type).map(([key, v]) => ({ key, ...v }));
  }
}
