import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SalesService } from '../../../services/sales.service';
import { Invoice, PAYMENT_METHOD_TYPE_LABELS, PaymentMethodType } from '../../../models/sales.model';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { buildInvoiceDisplayLines, InvoiceDisplayLine } from '../../../models/invoice-display.util';
import { AuthService } from '../../../services/auth.service';
import { NavigationHistoryService } from '../../../services/navigation-history.service';

@Component({
  selector: 'app-invoice-detail',
  imports: [
    CommonModule,
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    LoadingComponent,
    AlertComponent,
  ],
  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.css',
})
export class InvoiceDetailComponent implements OnInit {
  private salesService = inject(SalesService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private navigationHistory = inject(NavigationHistoryService);

  /** Same list route for seller and manager; admin has no `/dashboard/invoices`
   *  list — this component is mounted under all three dashboards, so the
   *  fallback/breadcrumb target must branch on role. */
  private get invoiceListFallback(): string {
    return this.authService.isAdmin() ? '/dashboard/all-invoices' : '/dashboard/invoices';
  }

  get invoiceListLink(): string {
    return this.invoiceListFallback;
  }

  invoiceId!: number;
  invoice: Invoice | null = null;
  pageLoading = false;
  statusLoading = false;
  alert: { show: boolean; type: 'success' | 'error' | ''; message: string } = {
    show: false,
    type: '',
    message: '',
  };

  ngOnInit(): void {
    this.invoiceId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadInvoice();
  }

  loadInvoice() {
    this.pageLoading = true;
    this.salesService.getInvoice(this.invoiceId).subscribe({
      next: (res) => {
        this.invoice = res.data || res;
        this.pageLoading = false;
      },
      error: () => {
        this.pageLoading = false;
      },
    });
  }

  updateStatus(status: 'approved' | 'cancelled') {
    if (!this.invoice || this.invoice.status === 'cancelled') return;
    this.statusLoading = true;
    this.alert = { show: false, type: '', message: '' };
    this.salesService.updateInvoiceStatus(this.invoiceId, status).subscribe({
      next: () => {
        this.statusLoading = false;
        this.invoice!.status = status;
        const label = status === 'approved' ? 'مكتملة' : 'ملغاة';
        this.alert = { show: true, type: 'success', message: `تم تغيير حالة الفاتورة إلى ${label}.` };
      },
      error: (err) => {
        this.statusLoading = false;
        this.alert = {
          show: true,
          type: 'error',
          message: err?.error?.message || 'تعذر تغيير حالة الفاتورة.',
        };
      },
    });
  }

  lineTotal(quantity: number, price: number): number {
    return quantity * price;
  }

  /**
   * Display lines — composed (perfume) items collapsed into one summarized
   * row each. The internal oil/bottle breakdown is visible only to Admin/
   * Branch Managers; a regular seller sees the same minimal line their
   * customer's printed receipt shows.
   */
  get displayLines(): InvoiceDisplayLine[] {
    const canSeeComposition = this.authService.isAdmin() || this.authService.isManager();
    return buildInvoiceDisplayLines((this.invoice as any)?.items ?? [], canSeeComposition);
  }

  /** Cost/profit are admin-only — this component is shared by both the
   *  Manager and Seller dashboards, and neither role should see profit. */
  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /** Profit per unit — line.profit is already the line's TOTAL profit
   *  (lineTotal − cost, from the frozen invoice snapshot), never recomputed
   *  from live product data. */
  lineProfitPerUnit(line: InvoiceDisplayLine): number {
    return line.quantity > 0 ? +(line.profit / line.quantity).toFixed(2) : 0;
  }

  grandTotal(): number {
    return this.displayLines.reduce((sum, line) => sum + line.lineTotal, 0);
  }

  totalCost(): number {
    return this.displayLines.reduce((sum, line) => sum + line.cost, 0);
  }

  totalProfit(): number {
    return this.displayLines.reduce((sum, line) => sum + line.profit, 0);
  }

  /** Total bank processing fee across all payment lines — report view only, never printed, invoice total is unaffected. */
  totalBankFee(): number {
    return (this.invoice?.payments ?? []).reduce((sum, p) => sum + (+(p.processing_fee_amount ?? 0)), 0);
  }

  hasBankFee(): boolean {
    return this.totalBankFee() > 0;
  }

  statusBadgeColor(status: string): 'warning' | 'success' | 'error' {
    if (status === 'approved') return 'success';
    if (status === 'cancelled') return 'error';
    return 'warning';
  }

  statusLabel(status: string): string {
    if (status === 'approved') return 'مكتملة';
    if (status === 'cancelled') return 'ملغاة';
    return 'معلقة';
  }

  paymentMethodLabel(method: string | undefined): string {
    if (!method) return '—';
    return PAYMENT_METHOD_TYPE_LABELS[method as PaymentMethodType] ?? method;
  }

  /**
   * Returns to wherever the user actually came from (cashier, invoice list,
   * customer details, reports, ...) when there's real in-app navigation
   * history; otherwise (opened directly via URL/deep link) falls back to
   * this invoice's own list — never a hardcoded route baked into the page.
   */
  goBack(): void {
    this.navigationHistory.back(this.invoiceListFallback);
  }
}
