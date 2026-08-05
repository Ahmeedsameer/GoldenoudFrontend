import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManagerInvoiceService } from '../../services/manager-invoice.service';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { SearchBarComponent } from '../../shared/components/common/search-bar/search-bar.component';

/**
 * Branch-wide sales invoices for a manager — every seller's sale in their
 * shop, not just their own (see ManagerInvoiceController). Lets a manager
 * cancel a completed sale, reversing both the stock and the money — the
 * seller-facing "طلباتي" screen only ever shows the seller's own sales and
 * has no cancel action at all.
 */
@Component({
  selector: 'app-manager-invoices',
  standalone: true,
  imports: [CommonModule, LoadingComponent, AlertComponent, SearchBarComponent],
  templateUrl: './manager-invoices.component.html',
})
export class ManagerInvoicesComponent implements OnInit {
  private service = inject(ManagerInvoiceService);

  loading = false;
  invoices: any[] = [];
  status: 'approved' | 'pending' | 'cancelled' = 'approved';
  search = '';
  actingId: number | null = null;
  alert: { show: boolean; type: 'success' | 'error' | ''; message: string } = { show: false, type: '', message: '' };

  statusTabs: { key: 'approved' | 'pending' | 'cancelled'; label: string }[] = [
    { key: 'approved',  label: 'مكتملة' },
    { key: 'pending',   label: 'قيد المراجعة' },
    { key: 'cancelled', label: 'ملغاة' },
  ];

  ngOnInit(): void {
    this.load();
  }

  setStatus(s: 'approved' | 'pending' | 'cancelled') {
    if (this.status === s) return;
    this.status = s;
    this.load();
  }

  setSearch(value: string) {
    this.search = value;
    this.load();
  }

  load() {
    this.loading = true;
    this.alert = { show: false, type: '', message: '' };
    const params: any = { status: this.status, per_page: 50 };
    if (this.search) params.search = this.search;
    this.service.getInvoices(params).subscribe({
      next: (res) => {
        const data = res?.data;
        this.invoices = Array.isArray(data) ? data : (data?.data ?? []);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  lineTotal(item: any): number {
    return (+item.quantity || 0) * (+item.price || 0);
  }

  cancelSale(inv: any) {
    const reason = prompt(`سبب إلغاء الفاتورة #${inv.id} (اختياري):`);
    if (reason === null) return;
    if (!confirm(`سيتم إرجاع المنتجات لمخزون الفرع واسترجاع المبلغ من الخزنة. هل تريد إلغاء الفاتورة #${inv.id}؟`)) return;

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
