import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SalesService } from '../../../services/sales.service';
import { Invoice, PAYMENT_METHODS } from '../../../models/sales.model';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';

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

  grandTotal(): number {
    if (!this.invoice?.items) return 0;
    return this.invoice.items.reduce(
      (sum, item) => sum + this.lineTotal(item.quantity, item.price),
      0
    );
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

  paymentMethodLabel(method: string): string {
    return PAYMENT_METHODS.find(m => m.value === method)?.label ?? method;
  }
}
