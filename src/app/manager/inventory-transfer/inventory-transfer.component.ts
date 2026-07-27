import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { StockService } from '../../services/stock.service';
import { LoadingComponent } from '../../loading/loading.component';

export interface ManagerGoodsItem {
  id: number;
  current_quantity: number;
  date: string;
  supply_item: {
    product: {
      id: number;
      name: string;
      sku: string;
      scalar: string;
      category?: { id: number; name: string };
    };
  };
}

export interface ProductShipment {
  transfer_request_id: number;
  request_number: string;
  source_shop: string | null;
  received_quantity: number;
  missing_quantity: number;
  damaged_quantity: number;
  received_at: string | null;
}

export interface ProductHistory {
  product_id: number;
  current_quantity: number;
  total_received: number;
  shipments: ProductShipment[];
}

/** A batch received within this many days is badged "جديد". */
const NEW_THRESHOLD_DAYS = 7;
/** A batch that's been sitting longer than this is badged "قديم" (aging, worth checking on). */
const OLD_THRESHOLD_DAYS = 60;

/**
 * View-only branch inventory for managers — see it, can't touch it. The only
 * legitimate way stock enters/leaves a branch is the Stock Request / Transfer
 * Request workflow (طلبات المخزون / طلبات النقل بين الفروع); the old instant
 * "manager transfer" action has been removed, not merely hidden here.
 *
 * Each row is one FIFO batch (not an aggregate per product), so recently-
 * received and long-sitting stock of the same product show as separate,
 * separately-dated rows — badged "جديد"/"قديم" from that date.
 */
@Component({
  selector: 'app-inventory-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  templateUrl: './inventory-transfer.component.html',
})
export class InventoryTransferComponent implements OnInit {
  private stockService = inject(StockService);

  loading = false;

  goods: ManagerGoodsItem[] = [];
  currentPage = 1;
  lastPage = 1;
  total = 0;

  searchQuery = '';
  private search$ = new Subject<string>();

  // ── Per-product receiving history (what was sent, what's left, when) ──
  showHistory = false;
  historyLoading = false;
  historyProductName = '';
  history: ProductHistory | null = null;

  ngOnInit(): void {
    this.loadGoods();

    this.search$
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.currentPage = 1; this.loadGoods(); });
  }

  loadGoods(): void {
    this.loading = true;
    const params: any = { page: this.currentPage, per_page: 25 };
    if (this.searchQuery.trim()) params.search = this.searchQuery.trim();

    this.stockService.getManagerInventory(params).subscribe({
      next: (res) => {
        this.goods       = res.data?.data ?? res.data ?? [];
        this.currentPage = res.data?.current_page ?? 1;
        this.lastPage    = res.data?.last_page    ?? 1;
        this.total       = res.data?.total        ?? this.goods.length;
        this.loading     = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.search$.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadGoods();
  }

  prevPage(): void { if (this.currentPage > 1) { this.currentPage--; this.loadGoods(); } }
  nextPage(): void { if (this.currentPage < this.lastPage) { this.currentPage++; this.loadGoods(); } }

  productName(item: ManagerGoodsItem): string { return item.supply_item?.product?.name ?? '—'; }
  sku(item: ManagerGoodsItem): string { return item.supply_item?.product?.sku ?? '—'; }
  scalar(item: ManagerGoodsItem): string { return item.supply_item?.product?.scalar ?? ''; }
  categoryName(item: ManagerGoodsItem): string { return item.supply_item?.product?.category?.name ?? '—'; }

  stockLevel(qty: number): 'critical' | 'low' | 'ok' {
    if (qty <= 0) return 'critical';
    if (qty <= 10) return 'low';
    return 'ok';
  }

  private ageDays(item: ManagerGoodsItem): number {
    const received = new Date(item.date).getTime();
    return Math.floor((Date.now() - received) / (1000 * 60 * 60 * 24));
  }

  ageBadge(item: ManagerGoodsItem): { label: string; class: string } | null {
    const days = this.ageDays(item);
    if (days <= NEW_THRESHOLD_DAYS) {
      return { label: 'جديد', class: 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300' };
    }
    if (days >= OLD_THRESHOLD_DAYS) {
      return { label: 'قديم', class: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' };
    }
    return null;
  }

  /** Clicking any batch row shows the full receiving history for that PRODUCT (across all its batches), not just this one row. */
  openHistory(item: ManagerGoodsItem): void {
    const productId = item.supply_item?.product?.id;
    if (!productId) return;

    this.historyProductName = this.productName(item);
    this.history = null;
    this.historyLoading = true;
    this.showHistory = true;

    this.stockService.getManagerProductHistory(productId).subscribe({
      next: (h) => { this.history = h; this.historyLoading = false; },
      error: () => { this.historyLoading = false; },
    });
  }

  closeHistory(): void {
    this.showHistory = false;
    this.history = null;
  }

  /** Same "جديد" convention as the batch list — a shipment received within the last week. */
  isRecentShipment(receivedAt: string | null): boolean {
    if (!receivedAt) return false;
    const days = Math.floor((Date.now() - new Date(receivedAt).getTime()) / (1000 * 60 * 60 * 24));
    return days <= NEW_THRESHOLD_DAYS;
  }
}
