import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverrideRequestSummary, OverrideService } from '../../services/override.service';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-override-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent],
  templateUrl: './override-requests.component.html',
})
export class OverrideRequestsComponent implements OnInit, OnDestroy {
  private overrideService = inject(OverrideService);

  requests: OverrideRequestSummary[] = [];
  loading = false;
  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  // Per-request UI state
  respondingId: string | null   = null;
  noteInputs: Record<string, string> = {};

  private pollingInterval: any = null;

  // ── Lifecycle ───────────────────────────────────────────────

  ngOnInit(): void {
    this.load();
    // Auto-refresh every 10 s so new requests appear without a page reload
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
        this.requests = data;
        if (!silent) this.loading = false;
      },
      error: () => { if (!silent) this.loading = false; },
    });
  }

  get pendingCount(): number {
    return this.requests.filter(r => r.status === 'pending').length;
  }

  // ── Actions ─────────────────────────────────────────────────

  approve(request: OverrideRequestSummary): void {
    this.respond(request.id, 'approved', this.noteInputs[request.id] ?? '');
  }

  reject(request: OverrideRequestSummary): void {
    if (!this.noteInputs[request.id]?.trim()) {
      this.alert = { show: true, type: 'error', message: 'يرجى إدخال سبب الرفض قبل المتابعة.' };
      return;
    }
    this.respond(request.id, 'rejected', this.noteInputs[request.id]);
  }

  private respond(id: string, action: 'approved' | 'rejected', note: string): void {
    this.respondingId = id;
    this.alert = { show: false, type: 'success', message: '' };

    this.overrideService.respond(id, action, note).subscribe({
      next: (res) => {
        this.respondingId = null;
        this.alert = {
          show: true,
          type: 'success',
          message: res.message ?? (action === 'approved' ? 'تمت الموافقة بنجاح' : 'تم الرفض بنجاح'),
        };
        this.load(true);
      },
      error: (err) => {
        this.respondingId = null;
        this.alert = {
          show: true,
          type: 'error',
          message: err?.error?.message ?? 'حدث خطأ غير متوقع.',
        };
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────

  statusLabel(status: string): string {
    return { pending: 'قيد الانتظار', approved: 'موافق عليه', rejected: 'مرفوض' }[status] ?? status;
  }

  timeSince(iso: string): string {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)   return `منذ ${diff} ثانية`;
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    return `منذ ${Math.floor(diff / 3600)} ساعة`;
  }
}
