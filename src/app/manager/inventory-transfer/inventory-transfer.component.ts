import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { StockService } from '../../services/stock.service';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';

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

@Component({
  selector: 'app-inventory-transfer',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent],
  templateUrl: './inventory-transfer.component.html',
})
export class InventoryTransferComponent implements OnInit {
  private stockService = inject(StockService);

  // ── State ────────────────────────────────────────────────────────
  loading       = false;
  transferring  = false;
  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  // ── Inventory list ───────────────────────────────────────────────
  goods: ManagerGoodsItem[] = [];
  currentPage  = 1;
  lastPage     = 1;
  total        = 0;

  // ── Search ───────────────────────────────────────────────────────
  searchQuery  = '';
  private search$ = new Subject<string>();

  // ── Transfer form ────────────────────────────────────────────────
  selected: ManagerGoodsItem | null = null;
  transferQty    = 0;
  toShopId: number | null = null;   // null = main warehouse

  // ── Destination shops ────────────────────────────────────────────
  shops: { id: number; name: string }[] = [];

  // ────────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadShops();
    this.loadGoods();

    this.search$
      .pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.currentPage = 1; this.loadGoods(); });
  }

  // ── Data loading ─────────────────────────────────────────────────
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

  loadShops(): void {
    this.stockService.getManagerShops().subscribe({
      next: (shops) => { this.shops = shops; },
    });
  }

  // ── Search ───────────────────────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.search$.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadGoods();
  }

  // ── Pagination ────────────────────────────────────────────────────
  prevPage(): void { if (this.currentPage > 1) { this.currentPage--; this.loadGoods(); } }
  nextPage(): void { if (this.currentPage < this.lastPage) { this.currentPage++; this.loadGoods(); } }

  // ── Selection ─────────────────────────────────────────────────────
  selectGoods(item: ManagerGoodsItem): void {
    this.selected    = item;
    this.transferQty = 0;
    this.toShopId    = null;
    this.alert       = { show: false, type: 'success', message: '' };
  }

  clearSelection(): void {
    this.selected    = null;
    this.transferQty = 0;
    this.toShopId    = null;
  }

  // ── Transfer submit ───────────────────────────────────────────────
  submitTransfer(): void {
    if (!this.selected) return;

    if (!this.transferQty || this.transferQty <= 0) {
      this.alert = { show: true, type: 'error', message: 'يرجى إدخال كمية صحيحة أكبر من صفر.' };
      return;
    }
    if (this.transferQty > this.selected.current_quantity) {
      this.alert = {
        show: true, type: 'error',
        message: `الكمية المطلوبة (${this.transferQty}) تتجاوز المتاح (${this.selected.current_quantity}).`,
      };
      return;
    }

    this.transferring = true;
    this.alert        = { show: false, type: 'success', message: '' };

    this.stockService.managerTransferGoods({
      goods_id:   this.selected.id,
      quantity:   this.transferQty,
      to_shop_id: this.toShopId,
    }).subscribe({
      next: (res) => {
        this.transferring = false;
        const destName = res.data?.destination?.shop?.name ?? 'المستودع الرئيسي';
        this.alert = {
          show: true, type: 'success',
          message: `تم نقل ${this.transferQty} ${this.selected!.supply_item.product.scalar} إلى ${destName} بنجاح.`,
        };
        this.clearSelection();
        this.loadGoods();        // refresh list so quantities update
      },
      error: (err) => {
        this.transferring = false;
        this.alert = { show: true, type: 'error', message: err?.error?.message ?? 'حدث خطأ أثناء النقل.' };
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  productName(item: ManagerGoodsItem): string {
    return item.supply_item?.product?.name ?? '—';
  }
  sku(item: ManagerGoodsItem): string {
    return item.supply_item?.product?.sku ?? '—';
  }
  scalar(item: ManagerGoodsItem): string {
    return item.supply_item?.product?.scalar ?? '';
  }
  categoryName(item: ManagerGoodsItem): string {
    return item.supply_item?.product?.category?.name ?? '—';
  }
  stockLevel(qty: number): 'critical' | 'low' | 'ok' {
    if (qty <= 0)   return 'critical';
    if (qty <= 10)  return 'low';
    return 'ok';
  }
}
