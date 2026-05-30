import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ListManager } from '../../../../services/list-manager';
import { StockService } from '../../../../services/stock.service';
import { Supply } from '../../../../models/stock.model';
import { Supplier } from '../../../../models/stock.model';
import { PaginationComponent } from '../../../../pagination/pagination.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { Option, SelectComponent } from '../../../../shared/components/form/select/select.component';

@Component({
  selector: 'app-supplies-list',
  imports: [
    CommonModule,
    RouterLink,
    PaginationComponent,
    ButtonComponent,
    LoadingComponent,
    ModalComponent,
    SelectComponent,
  ],
  templateUrl: './supplies-list.component.html',
  styleUrl: './supplies-list.component.css',
})
export class SuppliesListComponent implements OnInit {
  private stockService = inject(StockService);
  list = new ListManager<Supply>((params) => this.stockService.getSupplies(params));

  suppliers: Supplier[] = [];
  supplierOptions: Option[] = [{ value: '', label: 'كل الموردين' }];

  paymentOptions: Option[] = [
    { value: '', label: 'كل طرق الدفع' },
    { value: 'debt', label: 'آجل' },
    { value: 'immediate', label: 'فوري' },
  ];

  showDeleteModal = false;
  supplyToDelete: number | null = null;
  deleteLoading = false;
  deleteError: string | null = null;

  ngOnInit(): void {
    this.list.load();
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.stockService.getAllSuppliers().subscribe({
      next: (suppliers) => {
        this.suppliers = suppliers;
        this.supplierOptions = [
          { value: '', label: 'كل الموردين' },
          ...suppliers.map((s) => ({ value: String(s.id), label: s.name })),
        ];
      },
      error: () => {},
    });
  }

  setSupplierFilter(value: string) {
    this.list.setFilter('supplier_id', value);
  }

  setPaymentFilter(value: string) {
    this.list.setFilter('payment_method', value);
  }

  setDateFrom(value: string) {
    this.list.setFilter('date_from', value);
  }

  setDateTo(value: string) {
    this.list.setFilter('date_to', value);
  }

  calcTotal(supply: Supply): number {
    if (!supply.items) return 0;
    return supply.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }

  confirmDelete(id: number) {
    this.supplyToDelete = id;
    this.deleteError = null;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.supplyToDelete = null;
    this.deleteError = null;
  }

  doDelete() {
    if (!this.supplyToDelete) return;
    this.deleteLoading = true;
    this.deleteError = null;
    this.stockService.deleteSupply(this.supplyToDelete).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.supplyToDelete = null;
        this.deleteLoading = false;
        this.list.load();
      },
      error: (err) => {
        this.deleteLoading = false;
        this.deleteError = err?.error?.message || 'تعذر حذف التوريد.';
      },
    });
  }
}
