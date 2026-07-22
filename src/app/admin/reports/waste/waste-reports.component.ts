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
import { WasteReportService, WasteReportSummary, WasteReportType } from '../../../services/waste-report.service';

interface ReportTab { key: WasteReportType; label: string; columns: { key: string; label: string }[]; }

const TABS: ReportTab[] = [
  { key: 'by-product', label: 'حسب المنتج', columns: [
    { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' }, { key: 'record_count', label: 'عدد السجلات' }, { key: 'qty', label: 'الكمية' }, { key: 'value', label: 'القيمة التقديرية' },
  ] },
  { key: 'by-category', label: 'حسب الفئة', columns: [
    { key: 'category_name', label: 'الفئة' }, { key: 'record_count', label: 'عدد السجلات' }, { key: 'qty', label: 'الكمية' }, { key: 'value', label: 'القيمة التقديرية' },
  ] },
  { key: 'by-branch', label: 'حسب الفرع', columns: [
    { key: 'shop_name', label: 'الفرع' }, { key: 'record_count', label: 'عدد السجلات' }, { key: 'qty', label: 'الكمية' }, { key: 'value', label: 'القيمة التقديرية' },
  ] },
  { key: 'by-employee', label: 'حسب الموظف', columns: [
    { key: 'user_name', label: 'الموظف' }, { key: 'record_count', label: 'عدد السجلات' }, { key: 'qty', label: 'الكمية' }, { key: 'value', label: 'القيمة التقديرية' },
  ] },
  { key: 'by-supplier', label: 'حسب المورد', columns: [
    { key: 'supplier_name', label: 'المورد' }, { key: 'record_count', label: 'عدد السجلات' }, { key: 'qty', label: 'الكمية' }, { key: 'value', label: 'القيمة التقديرية' },
  ] },
  { key: 'by-reason', label: 'حسب السبب', columns: [
    { key: 'reason_label', label: 'السبب' }, { key: 'record_count', label: 'عدد السجلات' }, { key: 'qty', label: 'الكمية' }, { key: 'value', label: 'القيمة التقديرية' },
  ] },
  { key: 'trend', label: 'الاتجاه', columns: [
    { key: 'date', label: 'التاريخ' }, { key: 'qty', label: 'الكمية' }, { key: 'value', label: 'القيمة التقديرية' },
  ] },
  { key: 'top-products', label: 'الأكثر هالكاً', columns: [
    { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' }, { key: 'qty', label: 'الكمية' }, { key: 'value', label: 'القيمة التقديرية' },
  ] },
];

/**
 * Phase 4.8 — Waste Reports. "Waste by Supplier" is backed by real data:
 * WasteRecordBatch links each waste record to the exact Goods batch it was
 * drawn from, which chains to SupplyItem -> Supply -> Supplier — no
 * fabricated relationship. Records created before that link existed simply
 * won't appear in the by-supplier breakdown (honest, not backfilled).
 */
@Component({
  selector: 'app-waste-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportLineChartComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './waste-reports.component.html',
})
export class WasteReportsComponent implements OnInit {
  private svc = inject(WasteReportService);
  private route = inject(ActivatedRoute);

  tabs = TABS;
  activeTab: ReportTab = TABS[0];

  from = '';
  to = '';

  loading = false;
  rowsLoading = false;
  errorMsg = '';
  summary: WasteReportSummary | null = null;
  rows: any[] = [];

  trendCategories: string[] = [];
  trendSeries: { name: string; data: number[] }[] = [];

  get exportPath(): string { return `/branch-operations/reports/waste/${this.activeTab.key}/export`; }
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
        if (this.activeTab.key === 'trend') {
          this.trendCategories = rows.map((r) => r.date);
          this.trendSeries = [{ name: 'الكمية', data: rows.map((r) => r.qty) }, { name: 'القيمة', data: rows.map((r) => r.value) }];
        }
      },
      error: () => { this.rowsLoading = false; this.rows = []; },
    });
  }

  cell(row: any, key: string): any { return row[key]; }
}
