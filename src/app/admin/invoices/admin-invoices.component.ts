import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminInvoiceService } from '../../services/admin-invoice.service';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';

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

  statusTabs: { key: 'pending' | 'approved' | 'cancelled'; label: string }[] = [
    { key: 'pending',   label: 'قيد المراجعة' },
    { key: 'approved',  label: 'معتمدة' },
    { key: 'cancelled', label: 'مرفوضة' },
  ];

  ngOnInit(): void { this.load(); }

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
      },
      error: (err) => {
        this.actingId = null;
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'تعذّر تنفيذ العملية.' };
      },
    });
  }
}
