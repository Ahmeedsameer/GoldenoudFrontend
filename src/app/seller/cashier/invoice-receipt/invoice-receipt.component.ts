import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PAYMENT_METHODS } from '../../../models/sales.model';
import { CompanySettingsService } from '../../../services/company-settings.service';

@Component({
  selector: 'app-invoice-receipt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-receipt.component.html',
})
export class InvoiceReceiptComponent {
  companySettings = inject(CompanySettingsService);

  /** The invoice object returned by the API after a successful submission. */
  @Input() invoice: any = null;
  /** Controls visibility — parent toggles this. */
  @Input() show = false;
  /** Emitted when the user closes the modal. */
  @Output() closed = new EventEmitter<void>();

  close() { this.closed.emit(); }

  itemSubtotal(item: any): number {
    return +(item.quantity ?? 0) * +(item.price ?? 0);
  }

  /** Arabic label for a payment-method value (falls back to the raw value). */
  methodLabel(method: string): string {
    return PAYMENT_METHODS.find(m => m.value === method)?.label ?? method;
  }

  /** Whether a payment method carries a transaction/reference number. */
  methodHasTxn(method: string): boolean {
    return PAYMENT_METHODS.find(m => m.value === method)?.requiresTransactionNumber ?? false;
  }

  /**
   * Builds the receipt as a standalone HTML document and opens it in a new
   * browser window, then triggers the system print dialogue.
   * This avoids CSS conflicts with the Angular app's layout.
   */
  printReceipt(): void {
    if (!this.invoice) return;
    const inv = this.invoice;
    const company = this.companySettings.current;

    const itemRows = (inv.items ?? []).map((item: any) => `
      <tr>
        <td class="name">${item.product?.name ?? ''}</td>
        <td class="num">${(+item.quantity).toLocaleString('ar-EG', { maximumFractionDigits: 3 })} ${item.product?.scalar ?? ''}</td>
        <td class="num">${(+item.price).toFixed(2)}</td>
        <td class="num bold">${this.itemSubtotal(item).toFixed(2)}</td>
      </tr>`).join('');

    const customerRow = inv.customer?.name || inv.customer?.phone
      ? `<tr><td class="lbl">العميل</td><td>${inv.customer.name || inv.customer.phone}</td></tr>`
      : '';

    // Payment method(s) — includes the Visa transaction number when present.
    const paymentRows = (inv.payments ?? []).map((p: any) => {
      const label = this.methodLabel(p.payment_method);
      const amount = (+p.amount).toFixed(2);
      const code = p.currency?.code ?? '';
      const txn = this.methodHasTxn(p.payment_method) && p.transaction_number
        ? ` — رقم العملية: ${p.transaction_number}`
        : '';
      return `<tr><td class="lbl">الدفع (${label})</td><td>${amount} ${code}${txn}</td></tr>`;
    }).join('');

    const paymentsBlock = paymentRows
      ? `<hr class="divider"><table class="meta">${paymentRows}</table>`
      : '';

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة #${inv.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 12px;
      direction: rtl;
      text-align: right;
      width: 80mm;
      padding: 4mm 3mm;
      color: #111;
    }
    .center { text-align: center; }
    .co-logo { height: 34px; margin-bottom: 3px; }
    .co-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
    .shop-name { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
    .subtitle  { font-size: 11px; color: #555; margin-bottom: 6px; }
    .divider   { border: none; border-top: 1px dashed #aaa; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; }
    .meta td { padding: 1px 0; font-size: 11px; }
    .meta .lbl { color: #666; width: 30%; }
    .items thead tr { border-bottom: 1px solid #333; }
    .items th { font-size: 10px; padding: 2px 0; font-weight: 600; }
    .items td { padding: 2px 1px; font-size: 11px; }
    .items .name { width: 40%; }
    .items .num  { text-align: left; }
    .total-row { font-size: 14px; font-weight: 700; padding: 4px 0; }
    .status-badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; }
    .approved { background: #d1fae5; color: #065f46; }
    .pending  { background: #fef3c7; color: #92400e; }
    .footer { margin-top: 8px; font-size: 10px; color: #888; text-align: center; }
    .bold { font-weight: 700; }
  </style>
</head>
<body>
  <div class="center">
    ${company.logo_url ? `<img class="co-logo" src="${company.logo_url}" alt="">` : ''}
    <p class="co-name">${company.name}</p>
    <p class="shop-name">${inv.shop?.name ?? ''}</p>
    <p class="subtitle">فاتورة مبيعات</p>
  </div>
  <hr class="divider">
  <table class="meta">
    <tr><td class="lbl">رقم الفاتورة</td><td class="bold">#${inv.id}</td></tr>
    <tr><td class="lbl">التاريخ</td><td>${inv.date}</td></tr>
    <tr><td class="lbl">البائع</td><td>${inv.seller?.name ?? ''}</td></tr>
    ${customerRow}
    <tr><td class="lbl">الحالة</td>
      <td><span class="status-badge ${inv.status === 'approved' ? 'approved' : 'pending'}">
        ${inv.status === 'approved' ? 'معتمدة' : 'قيد المراجعة'}
      </span></td></tr>
  </table>
  <hr class="divider">
  <table class="items">
    <thead>
      <tr>
        <th class="name">الصنف</th>
        <th class="num">الكمية</th>
        <th class="num">سعر الوحدة</th>
        <th class="num">الإجمالي</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <hr class="divider">
  <table>
    <tr>
      <td class="total-row">الإجمالي الكلي</td>
      <td class="total-row" style="text-align:left">${(+inv.total_amount).toFixed(2)} ج.م</td>
    </tr>
  </table>
  ${paymentsBlock}
  <div class="footer">
    <p>شكراً لتعاملكم معنا</p>
    <p>${new Date().toLocaleString('ar-EG')}</p>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=420,height=680,scrollbars=yes');
    if (!win) {
      alert('يرجى السماح بفتح النوافذ المنبثقة في المتصفح لطباعة الفاتورة');
      return;
    }
    win.document.write(html);
    win.document.close();
    // Give the browser a moment to render before opening the print dialogue
    setTimeout(() => { win.focus(); win.print(); }, 400);
  }
}
