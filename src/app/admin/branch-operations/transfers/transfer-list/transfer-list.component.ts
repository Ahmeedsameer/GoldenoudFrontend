import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../../loading/loading.component';
import {
  TransferRequestService, TransferRequest, TransferStatus,
  TRANSFER_STATUS_LABELS as STATUS_LABELS,
  TRANSFER_PRIORITY_LABELS as PRIORITY_LABELS,
  TRANSFER_STATUS_CLASSES as STATUS_CLASSES,
} from '../../../../services/transfer-request.service';
import { ShopService } from '../../../../services/shop.service';
import { AuthService } from '../../../../services/auth.service';
import { SearchBarComponent } from '../../../../shared/components/common/search-bar/search-bar.component';

@Component({
  selector: 'app-transfer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, SearchBarComponent],
  templateUrl: './transfer-list.component.html',
})
export class TransferListComponent implements OnInit {
  private svc = inject(TransferRequestService);
  private shopSvc = inject(ShopService);
  private auth = inject(AuthService);

  private get isAdmin(): boolean { return this.auth.getUserRole() === 'admin'; }
  private get myShopId(): number | null { return this.auth.getUser()?.shop_id ?? null; }

  /**
   * Mirrors the backend's TransferRequestService::canApproveShop() so the "needs your
   * action" badge matches exactly what the server will actually let this user do —
   * admin always can; a manager only for their own shop (never the warehouse, since a
   * manager's shop_id is never the warehouse's id).
   */
  private canActOnShop(shopId: number): boolean {
    return this.isAdmin || this.myShopId === shopId;
  }

  /**
   * Whether THIS transfer is currently sitting in a state where the logged-in user is
   * the one who must act next — mirrors the ownership rules the controller enforces on
   * approve/reject (source), prepare/ship (source), receive (destination), close (either).
   */
  needsAction(t: TransferRequest): boolean {
    switch (t.status) {
      case 'submitted':
      case 'approved':
      case 'preparing':
        return this.canActOnShop(t.source_shop_id);
      case 'shipped':
        return this.canActOnShop(t.destination_shop_id);
      case 'received':
        return this.canActOnShop(t.source_shop_id) || this.canActOnShop(t.destination_shop_id);
      default:
        return false;
    }
  }

  loading = false;
  transfers: TransferRequest[] = [];
  meta: { current_page: number; last_page: number; total: number } | null = null;
  page = 1;

  statusFilter = '';
  shopFilter: number | null = null;
  search = '';
  shops: { id: number; name: string }[] = [];

  statuses: { key: string; label: string }[] = [
    { key: '', label: 'كل الحالات' },
    ...Object.entries(STATUS_LABELS).map(([key, label]) => ({ key, label })),
  ];

  ngOnInit(): void {
    this.shopSvc.getShops({ per_page: 200 }).subscribe({
      next: (res) => { this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); },
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.list({ status: this.statusFilter || undefined, shop_id: this.shopFilter ?? undefined, search: this.search || undefined, page: this.page, per_page: 20 }).subscribe({
      next: (page) => {
        this.transfers = page.data;
        this.meta = { current_page: page.current_page, last_page: page.last_page, total: page.total };
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilters(): void { this.page = 1; this.load(); }
  setSearch(value: string): void { this.search = value; this.applyFilters(); }
  nextPage(): void { if (this.meta && this.page < this.meta.last_page) { this.page++; this.load(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }

  statusLabel(s: string): string { return STATUS_LABELS[s as TransferStatus] ?? s; }
  priorityLabel(p: string): string { return PRIORITY_LABELS[p] ?? p; }
  statusClass(s: string): string { return STATUS_CLASSES[s as TransferStatus] ?? 'bg-gray-100 text-gray-600'; }
}
