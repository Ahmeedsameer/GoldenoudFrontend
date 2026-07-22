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
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import { TransferReportService, TransferReportSummary, TransferReportType } from '../../../services/transfer-report.service';

interface ReportTab { key: TransferReportType; label: string; columns: { key: string; label: string }[]; }

const TABS: ReportTab[] = [
  { key: 'by-branch', label: 'حسب الفرع', columns: [
    { key: 'shop_name', label: 'الفرع' }, { key: 'incoming', label: 'وارد' }, { key: 'outgoing', label: 'صادر' }, { key: 'total', label: 'الإجمالي' },
  ] },
  { key: 'by-product', label: 'حسب المنتج', columns: [
    { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' }, { key: 'transfer_count', label: 'عدد التحويلات' }, { key: 'total_qty', label: 'الكمية' },
  ] },
  { key: 'by-category', label: 'حسب الفئة', columns: [
    { key: 'category_name', label: 'الفئة' }, { key: 'transfer_count', label: 'عدد التحويلات' }, { key: 'total_qty', label: 'الكمية' },
  ] },
  { key: 'by-manager', label: 'حسب المدير', columns: [
    { key: 'user_name', label: 'المستخدم' }, { key: 'role', label: 'الدور' }, { key: 'transfer_count', label: 'عدد الطلبات' },
  ] },
  { key: 'by-employee', label: 'حسب الموظف', columns: [
    { key: 'user_name', label: 'المستخدم' }, { key: 'role', label: 'الدور' }, { key: 'transfer_count', label: 'عدد الطلبات' },
  ] },
  { key: 'delayed', label: 'المتأخرة', columns: [
    { key: 'request_number', label: 'رقم الطلب' }, { key: 'source', label: 'من' }, { key: 'destination', label: 'إلى' }, { key: 'status', label: 'الحالة' }, { key: 'created_at', label: 'تاريخ الإنشاء' },
  ] },
  { key: 'pending', label: 'المعلّقة', columns: [
    { key: 'request_number', label: 'رقم الطلب' }, { key: 'source', label: 'من' }, { key: 'destination', label: 'إلى' }, { key: 'status', label: 'الحالة' }, { key: 'created_at', label: 'تاريخ الإنشاء' },
  ] },
  { key: 'internal-invoices', label: 'الفواتير الداخلية', columns: [
    { key: 'invoice_number', label: 'رقم الفاتورة' }, { key: 'request_number', label: 'رقم الطلب' }, { key: 'source_name', label: 'من' },
    { key: 'destination_name', label: 'إلى' }, { key: 'date', label: 'التاريخ' }, { key: 'reference_value', label: 'القيمة المرجعية' }, { key: 'status', label: 'الحالة' },
  ] },
  { key: 'damaged', label: 'التالف أثناء النقل', columns: [
    { key: 'request_number', label: 'رقم الطلب' }, { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' },
    { key: 'source_name', label: 'من' }, { key: 'destination_name', label: 'إلى' }, { key: 'qty', label: 'الكمية التالفة' }, { key: 'received_at', label: 'تاريخ الاستلام' },
  ] },
  { key: 'missing', label: 'المفقود أثناء النقل', columns: [
    { key: 'request_number', label: 'رقم الطلب' }, { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' },
    { key: 'source_name', label: 'من' }, { key: 'destination_name', label: 'إلى' }, { key: 'qty', label: 'الكمية المفقودة' }, { key: 'received_at', label: 'تاريخ الاستلام' },
  ] },
  // Phase 5.6 —
  { key: 'by-type', label: 'حسب النوع', columns: [
    { key: 'type_label', label: 'نوع التحويل' }, { key: 'transfer_count', label: 'عدد الطلبات' },
  ] },
  { key: 'closed', label: 'المغلقة', columns: [
    { key: 'request_number', label: 'رقم الطلب' }, { key: 'source', label: 'من' }, { key: 'destination', label: 'إلى' }, { key: 'status', label: 'الحالة' }, { key: 'created_at', label: 'تاريخ الإنشاء' },
  ] },
  { key: 'emergency', label: 'الطارئة', columns: [
    { key: 'request_number', label: 'رقم الطلب' }, { key: 'source', label: 'من' }, { key: 'destination', label: 'إلى' }, { key: 'status', label: 'الحالة' }, { key: 'created_at', label: 'تاريخ الإنشاء' },
  ] },
  { key: 'partial-receipts', label: 'الاستلام الجزئي', columns: [
    { key: 'request_number', label: 'رقم الطلب' }, { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' },
    { key: 'source_name', label: 'من' }, { key: 'destination_name', label: 'إلى' }, { key: 'shipped_qty', label: 'الكمية المشحونة' }, { key: 'received_qty', label: 'الكمية المستلمة' }, { key: 'received_at', label: 'تاريخ الاستلام' },
  ] },
  { key: 'invoice-awaiting-receipt', label: 'فواتير بانتظار الاستلام', columns: [
    { key: 'invoice_number', label: 'رقم الفاتورة' }, { key: 'request_number', label: 'رقم الطلب' }, { key: 'source_name', label: 'من' },
    { key: 'destination_name', label: 'إلى' }, { key: 'date', label: 'التاريخ' }, { key: 'reference_value', label: 'القيمة المرجعية' }, { key: 'status', label: 'الحالة' },
  ] },
  { key: 'invoice-completed', label: 'فواتير مكتملة', columns: [
    { key: 'invoice_number', label: 'رقم الفاتورة' }, { key: 'request_number', label: 'رقم الطلب' }, { key: 'source_name', label: 'من' },
    { key: 'destination_name', label: 'إلى' }, { key: 'date', label: 'التاريخ' }, { key: 'reference_value', label: 'القيمة المرجعية' }, { key: 'status', label: 'الحالة' },
  ] },
  { key: 'warehouse-outgoing', label: 'صادر من المستودع', columns: [
    { key: 'request_number', label: 'رقم الطلب' }, { key: 'source', label: 'من' }, { key: 'destination', label: 'إلى' }, { key: 'status', label: 'الحالة' }, { key: 'created_at', label: 'تاريخ الشحن' },
  ] },
  { key: 'warehouse-distribution', label: 'توزيع المستودع', columns: [
    { key: 'shop_name', label: 'الفرع' }, { key: 'transfer_count', label: 'عدد التحويلات' }, { key: 'total_qty', label: 'الكمية' },
  ] },
  { key: 'most-requested-products', label: 'الأكثر طلباً من المستودع', columns: [
    { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' }, { key: 'transfer_count', label: 'عدد التحويلات' }, { key: 'total_qty', label: 'الكمية' },
  ] },
  { key: 'least-requested-products', label: 'الأقل طلباً من المستودع', columns: [
    { key: 'product_name', label: 'المنتج' }, { key: 'sku', label: 'الكود' }, { key: 'transfer_count', label: 'عدد التحويلات' }, { key: 'total_qty', label: 'الكمية' },
  ] },
];

/** Phase 4.7 — Transfer Reports: KPI summary + 10 switchable sub-reports, all sharing one export toolbar/table shell. */
@Component({
  selector: 'app-transfer-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './transfer-reports.component.html',
})
export class TransferReportsComponent implements OnInit {
  private svc = inject(TransferReportService);
  private route = inject(ActivatedRoute);

  tabs = TABS;
  activeTab: ReportTab = TABS[0];

  from = '';
  to = '';

  loading = false;
  rowsLoading = false;
  errorMsg = '';
  summary: TransferReportSummary | null = null;
  rows: any[] = [];

  get exportPath(): string { return `/branch-operations/reports/transfers/${this.activeTab.key}/export`; }
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
      next: (rows) => { this.rows = rows; this.rowsLoading = false; },
      error: () => { this.rowsLoading = false; this.rows = []; },
    });
  }

  formatMinutes(m: number | null): string {
    if (m == null) return '—';
    if (m < 60) return `${Math.round(m)} د`;
    const hours = m / 60;
    if (hours < 24) return `${hours.toFixed(1)} س`;
    return `${(hours / 24).toFixed(1)} يوم`;
  }

  cell(row: any, key: string): any { return row[key]; }
}
