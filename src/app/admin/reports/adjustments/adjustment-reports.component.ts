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
import { InventoryAdjustmentReportService, AdjustmentReportSummary, AdjustmentReportType } from '../../../services/inventory-adjustment-report.service';

interface ReportTab { key: AdjustmentReportType; label: string; columns: { key: string; label: string }[]; }

const DETAIL_COLUMNS = [
  { key: 'id', label: '#' }, { key: 'shop_name', label: 'الفرع' }, { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' },
  { key: 'before_quantity', label: 'قبل' }, { key: 'after_quantity', label: 'بعد' }, { key: 'difference', label: 'الفرق' },
  { key: 'status', label: 'الحالة' }, { key: 'origin', label: 'الأصل' }, { key: 'requested_by', label: 'طلب بواسطة' }, { key: 'created_at', label: 'التاريخ' },
];

const TABS: ReportTab[] = [
  { key: 'positive', label: 'الموجبة', columns: DETAIL_COLUMNS },
  { key: 'negative', label: 'السالبة', columns: DETAIL_COLUMNS },
  { key: 'by-branch', label: 'حسب الفرع', columns: [
    { key: 'shop_name', label: 'الفرع' }, { key: 'request_count', label: 'عدد الطلبات' }, { key: 'positive_qty', label: 'إجمالي الزيادة' }, { key: 'negative_qty', label: 'إجمالي النقص' },
  ] },
  { key: 'by-product', label: 'حسب المنتج', columns: [
    { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' }, { key: 'request_count', label: 'عدد الطلبات' }, { key: 'positive_qty', label: 'إجمالي الزيادة' }, { key: 'negative_qty', label: 'إجمالي النقص' },
  ] },
  { key: 'by-employee', label: 'حسب الموظف', columns: [
    { key: 'user_name', label: 'الموظف' }, { key: 'request_count', label: 'عدد الطلبات' }, { key: 'positive_qty', label: 'إجمالي الزيادة' }, { key: 'negative_qty', label: 'إجمالي النقص' },
  ] },
  { key: 'by-reason', label: 'حسب الأصل', columns: [
    { key: 'origin_label', label: 'الأصل' }, { key: 'request_count', label: 'عدد الطلبات' }, { key: 'positive_qty', label: 'إجمالي الزيادة' }, { key: 'negative_qty', label: 'إجمالي النقص' },
  ] },
  { key: 'monthly-trend', label: 'الاتجاه الشهري', columns: [
    { key: 'month', label: 'الشهر' }, { key: 'request_count', label: 'عدد الطلبات' }, { key: 'positive_qty', label: 'إجمالي الزيادة' }, { key: 'negative_qty', label: 'إجمالي النقص' },
  ] },
];

/**
 * Phase 4.10 — Inventory Adjustment Reports. "By Reason" groups by origin
 * (stock-count-driven vs. manual) since InventoryAdjustmentRequest.reason is
 * free text, not a fixed category — this reuses the existing
 * inventory_count_session_id link rather than a fabricated reason taxonomy.
 */
@Component({
  selector: 'app-adjustment-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportBarChartComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './adjustment-reports.component.html',
})
export class AdjustmentReportsComponent implements OnInit {
  private svc = inject(InventoryAdjustmentReportService);
  private route = inject(ActivatedRoute);

  tabs = TABS;
  activeTab: ReportTab = TABS[0];

  from = '';
  to = '';

  loading = false;
  rowsLoading = false;
  errorMsg = '';
  summary: AdjustmentReportSummary | null = null;
  rows: any[] = [];

  trendCategories: string[] = [];
  trendSeries: { name: string; data: number[] }[] = [];

  get exportPath(): string { return `/branch-operations/reports/adjustments/${this.activeTab.key}/export`; }
  get exportParams(): Record<string, any> { return { from: this.from || undefined, to: this.to || undefined }; }

  ngOnInit(): void {
    const requestedType = this.route.snapshot.queryParamMap.get('type');
    const match = requestedType ? this.tabs.find((t) => t.key === requestedType) : null;
    if (match) { this.activeTab = match; }
    this.loadAll();
  }

  setTab(tab: ReportTab): void {
    this.activeTab = tab;
    this.loadRows();
  }

  applyRange(): void { this.loadAll(); }
  clearRange(): void { this.from = ''; this.to = ''; this.loadAll(); }

  loadAll(): void {
    this.loading = true;
    this.errorMsg = '';
    this.svc.summary(this.from || undefined, this.to || undefined).subscribe({
      next: (s) => { this.summary = s; this.loading = false; this.loadRows(); },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل مؤشرات التقرير'; },
    });
  }

  loadRows(): void {
    this.rowsLoading = true;
    this.svc.data(this.activeTab.key, this.from || undefined, this.to || undefined).subscribe({
      next: (rows) => {
        this.rows = rows;
        this.rowsLoading = false;
        if (this.activeTab.key === 'monthly-trend') {
          this.trendCategories = rows.map((r) => r.month);
          this.trendSeries = [{ name: 'زيادة', data: rows.map((r) => r.positive_qty) }, { name: 'نقص', data: rows.map((r) => r.negative_qty) }];
        }
      },
      error: () => { this.rowsLoading = false; this.rows = []; },
    });
  }

  cell(row: any, key: string): any {
    const v = row[key];
    return v == null ? '—' : v;
  }
}
