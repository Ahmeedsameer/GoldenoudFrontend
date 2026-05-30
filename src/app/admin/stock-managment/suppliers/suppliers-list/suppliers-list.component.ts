import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ListManager } from '../../../../services/list-manager';
import { StockService } from '../../../../services/stock.service';
import { Supplier } from '../../../../models/stock.model';
import { PaginationComponent } from '../../../../pagination/pagination.component';
import { BadgeComponent } from '../../../../shared/components/ui/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';

@Component({
  selector: 'app-suppliers-list',
  imports: [
    CommonModule,
    RouterLink,
    PaginationComponent,
    BadgeComponent,
    ButtonComponent,
    LoadingComponent,
    ModalComponent,
  ],
  templateUrl: './suppliers-list.component.html',
  styleUrl: './suppliers-list.component.css',
})
export class SuppliersListComponent implements OnInit {
  private stockService = inject(StockService);
  list = new ListManager<Supplier>((params) => this.stockService.getSuppliers(params));

  showDeleteModal = false;
  supplierToDelete: number | null = null;
  deleteLoading = false;
  deleteError: string | null = null;

  ngOnInit(): void {
    this.list.load();
  }

  setSearchFilter(value: string) {
    this.list.setFilter('search', value);
  }

  confirmDelete(id: number) {
    this.supplierToDelete = id;
    this.deleteError = null;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.supplierToDelete = null;
    this.deleteError = null;
  }

  doDelete() {
    if (!this.supplierToDelete) return;
    this.deleteLoading = true;
    this.deleteError = null;
    this.stockService.deleteSupplier(this.supplierToDelete).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.supplierToDelete = null;
        this.deleteLoading = false;
        this.list.load();
      },
      error: (err) => {
        this.deleteLoading = false;
        this.deleteError = err?.error?.message || 'تعذر حذف المورد.';
      },
    });
  }
}
