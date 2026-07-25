import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import { StockService } from '../../../services/stock.service';

type TabKey = 'balances' | 'outstanding' | 'purchases' | 'payments';

interface ReportTab { key: TabKey; label: string; path: string; columns: { key: string; label: string }[]; usesDateRange: boolean; }

const PAYMENT_STATUS_LABELS: Record<string, string> = { paid: 'مدفوعة', partial: 'مدفوعة جزئياً', credit: 'آجل' };

const TABS: ReportTab[] = [
  { key: 'balances', label: 'أرصدة الموردين', path: '/stock/suppliers/reports/balances', usesDateRange: false, columns: [
    { key: 'name', label: 'المورد' }, { key: 'phone', label: 'الهاتف' }, { key: 'opening_balance', label: 'رصيد افتتاحي' },
    { key: 'total_invoiced', label: 'إجمالي الفواتير' }, { key: 'total_paid', label: 'إجمالي المدفوع' },
    { key: 'current_credit', label: 'الآجل الحالي' }, { key: 'outstanding_balance', label: 'الرصيد المستحق' }, { key: 'invoice_count', label: 'عدد الفواتير' },
  ] },
  { key: 'outstanding', label: 'الموردون ذوو الأرصدة المستحقة', path: '/stock/suppliers/reports/outstanding', usesDateRange: false, columns: [
    { key: 'name', label: 'المورد' }, { key: 'phone', label: 'الهاتف' }, { key: 'opening_balance', label: 'رصيد افتتاحي' },
    { key: 'total_invoiced', label: 'إجمالي الفواتير' }, { key: 'total_paid', label: 'إجمالي المدفوع' },
    { key: 'current_credit', label: 'الآجل الحالي' }, { key: 'outstanding_balance', label: 'الرصيد المستحق' }, { key: 'invoice_count', label: 'عدد الفواتير' },
  ] },
  { key: 'purchases', label: 'تقرير المشتريات', path: '/stock/suppliers/reports/purchases', usesDateRange: true, columns: [
    { key: 'invoice_number', label: 'رقم الفاتورة' }, { key: 'supplier', label: 'المورد' }, { key: 'date', label: 'التاريخ' },
    { key: 'total_amount', label: 'الإجمالي' }, { key: 'paid_amount', label: 'المدفوع' }, { key: 'remaining_amount', label: 'المتبقي' }, { key: 'payment_status', label: 'الحالة' },
  ] },
  { key: 'payments', label: 'سجل المدفوعات', path: '/stock/suppliers/reports/payments', usesDateRange: true, columns: [
    { key: 'date', label: 'التاريخ' }, { key: 'supplier', label: 'المورد' }, { key: 'invoice_number', label: 'رقم الفاتورة' },
    { key: 'amount', label: 'المبلغ' }, { key: 'currency', label: 'العملة' }, { key: 'safe', label: 'الخزنة' }, { key: 'user', label: 'بواسطة' }, { key: 'note', label: 'ملاحظة' },
  ] },
];

/** Cross-supplier reports: balances, outstanding, purchases, payment history — mirrors TransferReportsComponent's tab/table shell. */
@Component({
  selector: 'app-supplier-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent, ReportEmptyStateComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './supplier-reports.component.html',
})
export class SupplierReportsComponent implements OnInit {
  private stockService = inject(StockService);

  tabs = TABS;
  activeTab: ReportTab = TABS[0];

  from = '';
  to = '';

  rowsLoading = false;
  errorMsg = '';
  rows: any[] = [];

  get exportParams(): Record<string, any> {
    return this.activeTab.usesDateRange ? { date_from: this.from || undefined, date_to: this.to || undefined } : {};
  }

  /** HttpClient serializes `undefined` values as the literal string "undefined" — strip them before sending. */
  private apiParams(): Record<string, any> {
    const params: Record<string, any> = {};
    if (this.activeTab.usesDateRange) {
      if (this.from) params['date_from'] = this.from;
      if (this.to) params['date_to'] = this.to;
    }
    return params;
  }

  ngOnInit(): void {
    this.loadRows();
  }

  setTab(tab: ReportTab): void {
    this.activeTab = tab;
    this.loadRows();
  }

  applyRange(): void { this.loadRows(); }
  clearRange(): void { this.from = ''; this.to = ''; this.loadRows(); }

  loadRows(): void {
    this.rowsLoading = true;
    this.errorMsg = '';
    const params = this.apiParams();

    const handlers: Record<TabKey, () => void> = {
      balances: () => this.stockService.getSupplierBalances().subscribe(this.rowsObserver()),
      outstanding: () => this.stockService.getOutstandingSuppliers().subscribe(this.rowsObserver()),
      purchases: () => this.stockService.getSupplierPurchaseReport(params).subscribe(this.rowsObserver()),
      payments: () => this.stockService.getSupplierPaymentReport(params).subscribe({
        next: (res: any) => {
          const raw = res?.data?.data || [];
          this.rows = raw.map((p: any) => ({
            date: p.date, supplier: p.supplier?.name, invoice_number: p.supply?.invoice_number || '—',
            amount: p.amount, currency: p.currency?.code, safe: p.safe?.shop?.name || 'الخزنة الرئيسية',
            user: p.user?.name, note: p.note,
          }));
          this.rowsLoading = false;
        },
        error: () => { this.rowsLoading = false; this.rows = []; this.errorMsg = 'فشل تحميل التقرير'; },
      }),
    };
    handlers[this.activeTab.key]();
  }

  private rowsObserver() {
    return {
      next: (rows: any) => { this.rows = rows || []; this.rowsLoading = false; },
      error: () => { this.rowsLoading = false; this.rows = []; this.errorMsg = 'فشل تحميل التقرير'; },
    };
  }

  statusLabel(status: string): string { return PAYMENT_STATUS_LABELS[status] || status; }

  cell(row: any, key: string): any {
    if (key === 'payment_status') return this.statusLabel(row[key]);
    return row[key];
  }
}
