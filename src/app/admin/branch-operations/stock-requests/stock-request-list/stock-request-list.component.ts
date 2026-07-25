import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../../loading/loading.component';
import {
  TransferRequestService, TransferRequest, TransferStatus,
  TRANSFER_STATUS_LABELS as STATUS_LABELS,
  TRANSFER_STATUS_CLASSES as STATUS_CLASSES,
} from '../../../../services/transfer-request.service';
import { AuthService } from '../../../../services/auth.service';

/**
 * Stock Requests — NOT a new subsystem. This lists the exact same
 * TransferRequest rows as طلبات النقل بين الفروع, filtered server-side to
 * `warehouse_source=1` (every transfer sourced from the Main Warehouse).
 * Rows link straight into the existing transfer-detail screen, which already
 * has every approve/reject/ship/receive action gated correctly (a warehouse
 * source is already admin-only there — see canApproveShop()). Nothing here
 * duplicates status, FIFO, or approval logic.
 */
@Component({
  selector: 'app-stock-request-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent],
  templateUrl: './stock-request-list.component.html',
})
export class StockRequestListComponent implements OnInit {
  private svc = inject(TransferRequestService);
  private auth = inject(AuthService);

  get isManager(): boolean { return this.auth.getUserRole() === 'manager'; }

  loading = false;
  requests: TransferRequest[] = [];
  meta: { current_page: number; last_page: number; total: number } | null = null;
  page = 1;

  statusFilter = '';
  statuses: { key: string; label: string }[] = [
    { key: '', label: 'كل الحالات' },
    ...Object.entries(STATUS_LABELS).map(([key, label]) => ({ key, label })),
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.list({ warehouse_source: true, status: this.statusFilter || undefined, page: this.page, per_page: 20 }).subscribe({
      next: (page) => {
        this.requests = page.data;
        this.meta = { current_page: page.current_page, last_page: page.last_page, total: page.total };
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilters(): void { this.page = 1; this.load(); }
  nextPage(): void { if (this.meta && this.page < this.meta.last_page) { this.page++; this.load(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }

  statusLabel(s: string): string { return STATUS_LABELS[s as TransferStatus] ?? s; }
  statusClass(s: string): string { return STATUS_CLASSES[s as TransferStatus] ?? 'bg-gray-100 text-gray-600'; }

  /** Awaiting the admin's decision — mirrors the backend: only admin can approve/reject a warehouse-source request. */
  isPending(r: TransferRequest): boolean { return r.status === 'submitted'; }
}
