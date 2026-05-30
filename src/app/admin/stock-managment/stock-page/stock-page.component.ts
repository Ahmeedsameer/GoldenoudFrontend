import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuppliersListComponent } from '../suppliers/suppliers-list/suppliers-list.component';
import { SuppliesListComponent } from '../supplies/supplies-list/supplies-list.component';
import { WarehouseInventoryComponent } from '../inventory/warehouse-inventory/warehouse-inventory.component';

type StockTab = 'suppliers' | 'supplies' | 'inventory';

@Component({
  selector: 'app-stock-page',
  imports: [
    CommonModule,
    SuppliersListComponent,
    SuppliesListComponent,
    WarehouseInventoryComponent,
  ],
  templateUrl: './stock-page.component.html',
  styleUrl: './stock-page.component.css',
})
export class StockPageComponent {
  activeTab: StockTab = 'suppliers';

  setTab(tab: StockTab) {
    this.activeTab = tab;
  }
}
