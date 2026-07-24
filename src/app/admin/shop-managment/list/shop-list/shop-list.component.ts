import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaginationComponent } from '../../../../pagination/pagination.component';
import { BadgeComponent } from '../../../../shared/components/ui/badge/badge.component';
import { Option, SelectComponent } from '../../../../shared/components/form/select/select.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { ListManager } from '../../../../services/list-manager';
import { ShopService } from '../../../../services/shop.service';

@Component({
  selector: 'app-shop-list',
  imports: [
    CommonModule,
    RouterLink,
    PaginationComponent,
    BadgeComponent,
    SelectComponent,
    ButtonComponent,
    LoadingComponent,
    ModalComponent,
  ],
  templateUrl: './shop-list.component.html',
  styleUrl: './shop-list.component.css',
})
export class ShopListComponent implements OnInit {
  shopService: ShopService = inject(ShopService);
  list = new ListManager<any>((params) => this.shopService.getShops(params));

  statusOptions: Option[] = [
    { value: '', label: 'الكل' },
    { value: 'active', label: 'نشط' },
    { value: 'inactive', label: 'غير نشط' },
  ];

  showDeleteModal = false;
  shopToDelete: number | null = null;
  deleteLoading = false;

  ngOnInit(): void {
    // The Main Warehouse is a real Shop row internally (so Transfer Requests,
    // dashboards, and reports can treat it as a location), but it isn't a
    // retail branch — this CRUD list manages branches, so it's excluded here.
    // Warehouse stock itself is managed from المخزون والتوريدات → المخزون الرئيسي.
    this.list.filters['exclude_warehouse'] = 1;
    this.list.load();
  }

  setSearchFilter(value: string) {
    this.list.setFilter('search', value);
  }

  setStatusFilter(value: string) {
    this.list.setFilter('status', value);
  }

  confirmDelete(id: number) {
    this.shopToDelete = id;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.shopToDelete = null;
  }

  deleteShop() {
    if (!this.shopToDelete) return;
    this.deleteLoading = true;
    this.shopService.deleteShop(this.shopToDelete).subscribe({
      next: () => {
        this.showDeleteModal = false;
        this.shopToDelete = null;
        this.deleteLoading = false;
        this.list.load();
      },
      error: () => {
        this.deleteLoading = false;
      },
    });
  }
}
