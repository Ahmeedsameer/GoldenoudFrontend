import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportKpiCardComponent } from '../../../shared/components/reports/report-kpi-card/report-kpi-card.component';
import { ReportLoadingSkeletonComponent } from '../../../shared/components/reports/report-loading-skeleton/report-loading-skeleton.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { ReportLineChartComponent } from '../../../shared/components/reports/report-charts/report-line-chart.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import { InventoryCountReportService, InventoryCountReportSummary, InventoryCountReportType } from '../../../services/inventory-count-report.service';

interface ReportTab { key: InventoryCountReportType; label: string; columns: { key: string; label: string }[]; }

const TABS: ReportTab[] = [
  { key: 'sessions', label: 'كل الجلسات', columns: [
    { key: 'session_id', label: '#' }, { key: 'shop_name', label: 'الفرع' }, { key: 'created_by', label: 'أُنشئت بواسطة' },
    { key: 'status', label: 'الحالة' }, { key: 'items_count', label: 'عدد الأصناف' }, { key: 'accuracy_percent', label: 'الدقة %' }, { key: 'created_at', label: 'التاريخ' },
  ] },
  { key: 'approved', label: 'المعتمدة', columns: [
    { key: 'session_id', label: '#' }, { key: 'shop_name', label: 'الفرع' }, { key: 'created_by', label: 'أُنشئت بواسطة' },
    { key: 'status', label: 'الحالة' }, { key: 'items_count', label: 'عدد الأصناف' }, { key: 'accuracy_percent', label: 'الدقة %' }, { key: 'created_at', label: 'التاريخ' },
  ] },
  { key: 'pending', label: 'المعلّقة', columns: [
    { key: 'session_id', label: '#' }, { key: 'shop_name', label: 'الفرع' }, { key: 'created_by', label: 'أُنشئت بواسطة' },
    { key: 'status', label: 'الحالة' }, { key: 'items_count', label: 'عدد الأصناف' }, { key: 'accuracy_percent', label: 'الدقة %' }, { key: 'created_at', label: 'التاريخ' },
  ] },
  { key: 'branch-accuracy', label: 'دقة الفروع', columns: [
    { key: 'shop_name', label: 'الفرع' }, { key: 'items_counted', label: 'عدد الأصناف المجرودة' }, { key: 'accuracy_percent', label: 'الدقة %' },
  ] },
  { key: 'employee-accuracy', label: 'دقة الموظفين', columns: [
    { key: 'user_name', label: 'الموظف' }, { key: 'items_counted', label: 'عدد الأصناف المجرودة' }, { key: 'accuracy_percent', label: 'الدقة %' },
  ] },
  { key: 'product-variance', label: 'تباين المنتجات', columns: [
    { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' }, { key: 'times_counted', label: 'مرات الجرد' },
    { key: 'times_diff', label: 'مرات الاختلاف' }, { key: 'total_abs_diff', label: 'إجمالي الفروقات المطلقة' },
  ] },
  { key: 'biggest-differences', label: 'أكبر الفروقات', columns: [
    { key: 'session_id', label: '#الجلسة' }, { key: 'shop_name', label: 'الفرع' }, { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' },
    { key: 'system_quantity', label: 'كمية النظام' }, { key: 'physical_quantity', label: 'الكمية الفعلية' }, { key: 'difference', label: 'الفرق' },
  ] },
  { key: 'accuracy-trend', label: 'اتجاه الدقة', columns: [
    { key: 'session_id', label: '#الجلسة' }, { key: 'shop_name', label: 'الفرع' }, { key: 'date', label: 'التاريخ' }, { key: 'accuracy_percent', label: 'الدقة %' },
  ] },
];

/**
 * Phase 4.9 — Inventory Count Reports. "Employee Accuracy" is backed by the
 * new inventory_count_items.counted_by column — recordCounts() always knew
 * who was performing the count, it just wasn't persisted per item before.
 */
@Component({
  selector: 'app-count-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportLineChartComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './count-reports.component.html',
})
export class CountReportsComponent implements OnInit {
  private svc = inject(InventoryCountReportService);
  private route = inject(ActivatedRoute);

  tabs = TABS;
  activeTab: ReportTab = TABS[0];

  from = '';
  to = '';

  loading = false;
  rowsLoading = false;
  errorMsg = '';
  summary: InventoryCountReportSummary | null = null;
  rows: any[] = [];

  trendCategories: string[] = [];
  trendSeries: { name: string; data: number[] }[] = [];

  get exportPath(): string { return `/branch-operations/reports/counts/${this.activeTab.key}/export`; }
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
        if (this.activeTab.key === 'accuracy-trend') {
          this.trendCategories = rows.map((r) => r.date);
          this.trendSeries = [{ name: 'الدقة %', data: rows.map((r) => r.accuracy_percent ?? 0) }];
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
