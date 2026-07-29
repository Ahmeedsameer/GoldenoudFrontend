import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import { PaymentMethodReportService } from '../../../services/payment-method-report.service';

type TabKey = 'payment-methods' | 'card-fees' | 'bank-charges' | 'branch-payments' | 'currency' | 'safe-balance' | 'child-transfers';

interface ReportTab { key: TabKey; label: string; exportPath: string; columns: { key: string; label: string }[]; }

const TABS: ReportTab[] = [
  { key: 'payment-methods', label: 'تقرير وسائل الدفع', exportPath: '/admin/reports/payment-methods', columns: [
    { key: 'name', label: 'وسيلة الدفع' }, { key: 'type_label', label: 'النوع' }, { key: 'payment_count', label: 'عدد العمليات' },
    { key: 'gross_amount', label: 'إجمالي المدفوع' }, { key: 'fee_amount', label: 'رسوم المعالجة' }, { key: 'net_amount', label: 'صافي الشركة' },
  ] },
  { key: 'card-fees', label: 'تقرير رسوم البطاقات', exportPath: '/admin/reports/payment-methods/card-fees', columns: [
    { key: 'invoice_id', label: 'رقم الفاتورة' }, { key: 'date', label: 'التاريخ' }, { key: 'branch', label: 'الفرع' }, { key: 'method', label: 'وسيلة الدفع' },
    { key: 'gross_amount', label: 'المبلغ الإجمالي' }, { key: 'fee_percent', label: 'نسبة الرسوم %' }, { key: 'fee_amount', label: 'قيمة الرسوم' }, { key: 'net_amount', label: 'الصافي' },
  ] },
  { key: 'bank-charges', label: 'تقرير رسوم البنك', exportPath: '/admin/reports/payment-methods/bank-charges', columns: [
    { key: 'bank', label: 'البنك / الوسيلة' }, { key: 'card_type_label', label: 'نوع البطاقة' }, { key: 'charge_count', label: 'عدد العمليات' },
    { key: 'gross_amount', label: 'إجمالي المبلغ' }, { key: 'fee_amount', label: 'إجمالي الرسوم' }, { key: 'avg_fee', label: 'متوسط الرسوم' }, { key: 'net_amount', label: 'الصافي المودع' },
  ] },
  { key: 'branch-payments', label: 'تقرير المدفوعات حسب الفرع', exportPath: '/admin/reports/payment-methods/branch-payments', columns: [
    { key: 'branch', label: 'الفرع' }, { key: 'method', label: 'وسيلة الدفع' }, { key: 'payment_count', label: 'عدد العمليات' },
    { key: 'gross_amount', label: 'إجمالي المبلغ' }, { key: 'fee_amount', label: 'الرسوم' }, { key: 'net_amount', label: 'الصافي' },
  ] },
  { key: 'currency', label: 'تقرير العملات', exportPath: '/admin/reports/payment-methods/currency', columns: [
    { key: 'code', label: 'العملة' }, { key: 'payment_count', label: 'عدد العمليات' }, { key: 'gross_amount', label: 'إجمالي المدفوع' },
    { key: 'fee_amount', label: 'الرسوم' }, { key: 'net_amount', label: 'الصافي' }, { key: 'wallet_balance', label: 'الرصيد الحالي في الخزائن' },
  ] },
  { key: 'safe-balance', label: 'رصيد الخزنة حسب وسيلة الدفع', exportPath: '/admin/reports/payment-methods/safe-balance', columns: [
    { key: 'branch', label: 'الفرع' }, { key: 'safe', label: 'الخزنة' }, { key: 'method', label: 'وسيلة الدفع' }, { key: 'balance', label: 'الرصيد' },
  ] },
  { key: 'child-transfers', label: 'التحويلات بين وسائل الدفع', exportPath: '/admin/reports/payment-methods/child-transfers', columns: [
    { key: 'date', label: 'التاريخ' }, { key: 'branch', label: 'الفرع' }, { key: 'from_method', label: 'من وسيلة' },
    { key: 'to_method', label: 'إلى وسيلة' }, { key: 'currency', label: 'العملة' }, { key: 'amount', label: 'المبلغ' }, { key: 'admin', label: 'بواسطة' },
  ] },
];

/** Payment Method Report / Card Fees Report / Bank Charges Report — one shared shell, mirrors SupplierReportsComponent's tab/table pattern. */
@Component({
  selector: 'app-payment-method-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent, ReportEmptyStateComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './payment-method-reports.component.html',
})
export class PaymentMethodReportsComponent implements OnInit {
  private service = inject(PaymentMethodReportService);

  tabs = TABS;
  activeTab: ReportTab = TABS[0];

  from = '';
  to = '';

  rowsLoading = false;
  errorMsg = '';
  rows: any[] = [];
  totalFees: number | null = null;
  /** Net Card Revenue — Bank Cards module, bank-charges tab only. */
  totalNetRevenue: number | null = null;

  get exportParams(): Record<string, any> {
    const p: Record<string, any> = {};
    if (this.from) p['date_from'] = this.from;
    if (this.to) p['date_to'] = this.to;
    return p;
  }

  ngOnInit(): void { this.load(); }

  setTab(tab: ReportTab): void { this.activeTab = tab; this.load(); }
  applyRange(): void { this.load(); }
  clearRange(): void { this.from = ''; this.to = ''; this.load(); }

  load(): void {
    this.rowsLoading = true;
    this.errorMsg = '';
    const params = this.exportParams;

    const handlers: Record<TabKey, () => void> = {
      'payment-methods': () => this.service.getPaymentMethods(params).subscribe(this.observer((d) => d.rows)),
      'card-fees': () => this.service.getCardFees(params).subscribe(this.observer((d) => d.rows, (d) => d.total_fees)),
      'bank-charges': () => this.service.getBankCharges(params).subscribe(this.observer((d) => d.rows, (d) => d.total_fees, (d) => d.total_net_revenue)),
      'branch-payments': () => this.service.getBranchPayments(params).subscribe(this.observer((d) => this.flattenBranches(d.branches))),
      'currency': () => this.service.getCurrencyReport(params).subscribe(this.observer((d) => d.rows)),
      'safe-balance': () => this.service.getSafeBalance(params).subscribe(this.observer((d) => d.rows)),
      'child-transfers': () => this.service.getChildTransfers(params).subscribe(this.observer((d) => d.rows)),
    };
    handlers[this.activeTab.key]();
  }

  private observer(rowsFn: (data: any) => any[], totalFeesFn?: (data: any) => number, totalNetRevenueFn?: (data: any) => number) {
    return {
      next: (res: any) => {
        const data = res?.data;
        this.rows = rowsFn(data) || [];
        this.totalFees = totalFeesFn ? totalFeesFn(data) : null;
        this.totalNetRevenue = totalNetRevenueFn ? totalNetRevenueFn(data) : null;
        this.rowsLoading = false;
      },
      error: () => { this.rowsLoading = false; this.rows = []; this.errorMsg = 'فشل تحميل التقرير'; },
    };
  }

  cell(row: any, key: string): any { return row[key]; }

  /** branchPayments() returns one entry per branch with a nested methods[] — flatten to one row per (branch, method) for the shared generic table. */
  private flattenBranches(branches: any[]): any[] {
    return (branches || []).flatMap((b) => (b.methods || []).map((m: any) => ({ branch: b.branch, ...m })));
  }
}
