import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockService } from '../../../../services/stock.service';
import { Goods } from '../../../../models/stock.model';
import { extractPagination, PaginationResult } from '../../../../services/pagination-helper.service';
import { PaginationComponent } from '../../../../pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';

type TransferMode = 'return' | 'transfer';

@Component({
  selector: 'app-shop-stock',
  imports: [CommonModule, FormsModule, PaginationComponent, ButtonComponent, LoadingComponent, ModalComponent],
  templateUrl: './shop-stock.component.html',
  styleUrl: './shop-stock.component.css',
})
export class ShopStockComponent implements OnInit {
  @Input() shopId!: number;

  private stockService = inject(StockService);

  result: PaginationResult<Goods> = { data: [], links: [], currentPage: 1, totalPages: 1 };
  loading = false;
  search = '';
  currentPage = 1;

  // Modal
  showModal = false;
  mode: TransferMode = 'return';
  selectedGoods: Goods | null = null;
  transferQty: number | null = null;
  transferShopId: number | null = null;
  actionLoading = false;
  actionError: string | null = null;

  shops: { id: number; name: string }[] = [];

  ngOnInit(): void {
    this.loadStock();
    this.stockService.getActiveShops().subscribe({
      next: (shops) => {
        this.shops = shops.filter((s) => s.id !== this.shopId);
    
        
      },
      error: () => {},
    });
  }

  loadStock(page: number = 1) {
    this.currentPage = page;
    this.loading = true;
    const params: any = { shop_id: this.shopId, per_page: 20, page };
    if (this.search) params['search'] = this.search;

    this.stockService.getInventory(params).subscribe({
      next: (res) => {
        this.result = extractPagination<Goods>(res.data);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  setSearch(value: string) {
    this.search = value;
    this.loadStock(1);
  }

  isLow(goods: Goods): boolean {
    const original = goods.supply_item?.quantity || 0;
    return original > 0 && goods.current_quantity < original * 0.1;
  }

  openReturn(goods: Goods) {
    this.selectedGoods = goods;
    this.mode = 'return';
    this.transferQty = null;
    this.transferShopId = null;
    this.actionError = null;
    this.showModal = true;
  }

  openTransfer(goods: Goods) {
    this.selectedGoods = goods;
    this.mode = 'transfer';
    this.transferQty = null;
    this.transferShopId = null;
    this.actionError = null;
    this.showModal = true;
  }

  doAction() {
    if (!this.selectedGoods || !this.transferQty) return;
    if (this.mode === 'transfer' && !this.transferShopId) return;

    this.actionLoading = true;
    this.actionError = null;

    this.stockService.transferGoods({
      goods_id: this.selectedGoods.id,
      quantity: this.transferQty,
      to_shop_id: this.mode === 'return' ? null : this.transferShopId,
    }).subscribe({
      next: () => {
        this.actionLoading = false;
        this.showModal = false;
        this.loadStock(this.currentPage);
      },
      error: (err) => {
        this.actionLoading = false;
        this.actionError = err?.error?.message || 'تعذر تنفيذ العملية.';
      },
    });
  }
}
