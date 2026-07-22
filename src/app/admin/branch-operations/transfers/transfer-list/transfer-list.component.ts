import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../../loading/loading.component';
import { TransferRequestService, TransferRequest, TransferStatus } from '../../../../services/transfer-request.service';
import { ShopService } from '../../../../services/shop.service';
import { AuthService } from '../../../../services/auth.service';

const STATUS_LABELS: Record<TransferStatus, string> = {
  draft: 'مسودة', submitted: 'بانتظار الموافقة', approved: 'تمت الموافقة', rejected: 'مرفوض',
  preparing: 'قيد التجهيز', shipped: 'تم الشحن', received: 'تم الاستلام', closed: 'مغلق',
};
const STATUS_CLASSES: Record<TransferStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  rejected: 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-300',
  preparing: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  shipped: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  received: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  closed: 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300',
};

@Component({
  selector: 'app-transfer-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent],
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
    this.svc.list({ status: this.statusFilter || undefined, shop_id: this.shopFilter ?? undefined, page: this.page, per_page: 20 }).subscribe({
      next: (page) => {
        this.transfers = page.data;
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
}
