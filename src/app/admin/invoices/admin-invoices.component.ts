import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminInvoiceService } from '../../services/admin-invoice.service';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { PAYMENT_METHOD_TYPE_LABELS, PaymentMethodType } from '../../models/sales.model';

@Component({
  selector: 'app-admin-invoices',
  standalone: true,
  imports: [CommonModule, LoadingComponent, AlertComponent],
  templateUrl: './admin-invoices.component.html',
})
export class AdminInvoicesComponent implements OnInit {
  private service = inject(AdminInvoiceService);

  loading = false;
  invoices: any[] = [];
  status: 'pending' | 'approved' | 'cancelled' = 'pending';
  actingId: number | null = null;
  alert: { show: boolean; type: 'success' | 'error' | ''; message: string } = { show: false, type: '', message: '' };

  /** Every invoice sitting in this list needs the admin's action — shown as a count badge on the tab itself. */
  pendingCount = 0;

  statusTabs: { key: 'pending' | 'approved' | 'cancelled'; label: string }[] = [
    { key: 'pending',   label: 'قيد المراجعة' },
    { key: 'approved',  label: 'معتمدة' },
    { key: 'cancelled', label: 'مرفوضة' },
  ];

  /** Sortable columns — values (total_cost/gross_profit/bank_fee/net_profit) come straight
   *  from the backend's Invoice accessors (same figures as the invoice detail page); sorting
   *  itself is done in-memory over the already-loaded page, no extra calculation or API call. */
  sortColumns: { key: string; label: string }[] = [
    { key: 'date',          label: 'التاريخ' },
    { key: 'total_amount',  label: 'الإجمالي' },
    { key: 'total_cost',    label: 'التكلفة' },
    { key: 'gross_profit',  label: 'الربح الإجمالي' },
    { key: 'bank_fee',      label: 'رسوم البنك' },
    { key: 'net_profit',    label: 'صافي الربح' },
  ];
  sortBy = 'date';
  sortDir: 'asc' | 'desc' = 'desc';

  setSort(key: string): void {
    if (this.sortBy === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = key;
      this.sortDir = 'desc';
    }
  }

  get sortedInvoices(): any[] {
    const dir = this.sortDir === 'asc' ? 1 : -1;
    const key = this.sortBy;
    return [...this.invoices].sort((a, b) => {
      const va = key === 'date' ? new Date(a.date).getTime() : +(a[key] ?? 0);
      const vb = key === 'date' ? new Date(b.date).getTime() : +(b[key] ?? 0);
      return (va - vb) * dir;
    });
  }

  ngOnInit(): void {
    this.load();
    this.loadPendingCount();
  }

  private loadPendingCount(): void {
    this.service.getInvoices({ status: 'pending', per_page: 1 }).subscribe({
      next: (res) => { this.pendingCount = res?.data?.total ?? 0; },
    });
  }

  setStatus(s: 'pending' | 'approved' | 'cancelled') {
    if (this.status === s) return;
    this.status = s;
    this.load();
  }

  load() {
    this.loading = true;
    this.alert = { show: false, type: '', message: '' };
    this.service.getInvoices({ status: this.status, per_page: 50 }).subscribe({
      next: (res) => {
        const data = res?.data;
        this.invoices = Array.isArray(data) ? data : (data?.data ?? []);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Helpers ─────────────────────────────────────────────
  lineTotal(item: any): number {
    return (+item.quantity || 0) * (+item.price || 0);
  }

  categoryMin(item: any): number | null {
    const v = item?.product?.category?.minimum_sell_price;
    return v == null ? null : +v;
  }

  /** An item sold below its category's minimum selling price. */
  isBelowMin(item: any): boolean {
    const min = this.categoryMin(item);
    return min != null && (+item.price || 0) < min;
  }

  hasViolation(inv: any): boolean {
    return (inv.items ?? []).some((it: any) => this.isBelowMin(it));
  }

  /** Arabic label for a payment's method type — same lookup used on the invoice detail page. */
  paymentMethodLabel(method: string | undefined): string {
    if (!method) return '—';
    return PAYMENT_METHOD_TYPE_LABELS[method as PaymentMethodType] ?? method;
  }

  // ── Actions ─────────────────────────────────────────────
  approve(inv: any) { this.act(inv, 'approved'); }
  reject(inv: any)  { this.act(inv, 'cancelled'); }

  private act(inv: any, status: 'approved' | 'cancelled') {
    const verb = status === 'approved' ? 'اعتماد' : 'رفض';
    if (!confirm(`هل تريد ${verb} الفاتورة #${inv.id}؟`)) return;

    this.actingId = inv.id;
    this.service.updateStatus(inv.id, status).subscribe({
      next: (res) => {
        this.actingId = null;
        this.alert = { show: true, type: 'success', message: res?.message || `تم ${verb} الفاتورة` };
        // remove from the current (pending) list
        this.invoices = this.invoices.filter(i => i.id !== inv.id);
        this.pendingCount = Math.max(0, this.pendingCount - 1);
      },
      error: (err) => {
        this.actingId = null;
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'تعذّر تنفيذ العملية.' };
      },
    });
  }

  /** Cancel a completed (approved) sale — returns the sold products to stock and refunds the safe. */
  cancelSale(inv: any) {
    const reason = prompt(`سبب إلغاء الفاتورة #${inv.id} (اختياري):`);
    if (reason === null) return; // user pressed Cancel on the prompt itself
    if (!confirm(`سيتم إرجاع المنتجات للمخزون واسترجاع المبلغ من الخزنة. هل تريد إلغاء الفاتورة #${inv.id}؟`)) return;

    this.actingId = inv.id;
    this.service.cancel(inv.id, reason || undefined).subscribe({
      next: (res) => {
        this.actingId = null;
        this.alert = { show: true, type: 'success', message: res?.message || 'تم إلغاء الفاتورة' };
        this.invoices = this.invoices.filter(i => i.id !== inv.id);
      },
      error: (err) => {
        this.actingId = null;
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'تعذّر إلغاء الفاتورة.' };
      },
    });
  }
}
