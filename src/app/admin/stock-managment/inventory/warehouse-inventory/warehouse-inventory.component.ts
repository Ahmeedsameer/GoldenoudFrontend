import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { StockService } from '../../../../services/stock.service';
import { Goods } from '../../../../models/stock.model';
import { ListManager } from '../../../../services/list-manager';
import { PaginationComponent } from '../../../../pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';

@Component({
  selector: 'app-warehouse-inventory',
  imports: [CommonModule, FormsModule, PaginationComponent, ButtonComponent, LoadingComponent, ModalComponent],
  templateUrl: './warehouse-inventory.component.html',
  styleUrl: './warehouse-inventory.component.css',
})
export class WarehouseInventoryComponent implements OnInit {
  private stockService = inject(StockService);

  // Unwrap the outer {message, data: {data:[...], current_page, last_page}} envelope
  // before ListManager feeds the result to extractPagination.
  list = new ListManager<Goods>(
    (params) => this.stockService.getInventory(params).pipe(map((res: any) => res.data))
  );

  // Transfer modal
  showTransferModal = false;
  selectedGoods: Goods | null = null;
  transferQty: number | null = null;
  transferShopId: number | null = null;
  transferLoading = false;
  transferError: string | null = null;

  shops: { id: number; name: string }[] = [];

  ngOnInit(): void {
    this.list.load();
    this.stockService.getActiveShops().subscribe({
      next: (shops) => { this.shops = shops; },
      error: () => {},
    });
  }

  setSearch(value: string) {
    this.list.setFilter('search', value);
  }

  isLow(goods: Goods): boolean {
    const original = goods.supply_item?.quantity || 0;
    return original > 0 && goods.current_quantity < original * 0.1;
  }

  openTransfer(goods: Goods) {
    this.selectedGoods = goods;
    this.transferQty = null;
    this.transferShopId = null;
    this.transferError = null;
    this.showTransferModal = true;
  }

  doTransfer() {
    if (!this.selectedGoods || !this.transferQty || !this.transferShopId) return;
    this.transferLoading = true;
    this.transferError = null;
    this.stockService.transferGoods({
      goods_id: this.selectedGoods.id,
      quantity: this.transferQty,
      to_shop_id: this.transferShopId,
    }).subscribe({
      next: () => {
        this.transferLoading = false;
        this.showTransferModal = false;
        this.list.load();
      },
      error: (err) => {
        this.transferLoading = false;
        this.transferError = err?.error?.message || 'تعذر نقل البضاعة.';
      },
    });
  }
}
