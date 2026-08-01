import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverrideService } from '../../services/override.service';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-override-requests',
  standalone: true,
  imports: [CommonModule, LoadingComponent, AlertComponent],
  templateUrl: './override-requests.component.html',
})
export class OverrideRequestsComponent implements OnInit, OnDestroy {
  private overrideService = inject(OverrideService);

  /** Pending invoices (sold below category minimum) for this manager's own shop. */
  invoices: any[] = [];
  loading = false;
  actingId: number | null = null;
  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  private pollingInterval: any = null;

  // ── Lifecycle ───────────────────────────────────────────────

  ngOnInit(): void {
    this.load();
    // Auto-refresh every 10 s so newly-created pending invoices appear without a page reload
    this.pollingInterval = setInterval(() => this.load(true), 10_000);
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  // ── Data ────────────────────────────────────────────────────

  load(silent = false): void {
    if (!silent) this.loading = true;
    this.overrideService.getPendingRequests().subscribe({
      next: (data) => {
        this.invoices = data;
        if (!silent) this.loading = false;
      },
      error: () => { if (!silent) this.loading = false; },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────

  lineTotal(item: any): number {
    return (+item.quantity || 0) * (+item.price || 0);
  }

  categoryMin(item: any): number | null {
    const v = item?.product?.category?.minimum_sell_price;
    return v == null ? null : +v;
  }

  isBelowMin(item: any): boolean {
    const min = this.categoryMin(item);
    return min != null && (+item.price || 0) < min;
  }

  // ── Actions ─────────────────────────────────────────────────

  approve(inv: any): void {
    if (!confirm(`هل تريد اعتماد الفاتورة #${inv.id}؟`)) return;
    this.respond(inv, 'approved');
  }

  reject(inv: any): void {
    if (!confirm(`هل تريد رفض الفاتورة #${inv.id}؟`)) return;
    this.respond(inv, 'cancelled');
  }

  private respond(inv: any, status: 'approved' | 'cancelled'): void {
    this.actingId = inv.id;
    this.alert = { show: false, type: 'success', message: '' };

    this.overrideService.respond(inv.id, status).subscribe({
      next: (res) => {
        this.actingId = null;
        this.alert = {
          show: true,
          type: 'success',
          message: res.message ?? (status === 'approved' ? 'تمت الموافقة بنجاح' : 'تم الرفض بنجاح'),
        };
        this.invoices = this.invoices.filter(i => i.id !== inv.id);
      },
      error: (err) => {
        this.actingId = null;
        this.alert = {
          show: true,
          type: 'error',
          message: err?.error?.message ?? 'حدث خطأ غير متوقع.',
        };
      },
    });
  }
}
