import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ListManager } from '../../../services/list-manager';
import { CustomerService } from '../../../services/customer.service';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { LoadingComponent } from '../../../loading/loading.component';
import { SearchBarComponent } from '../../../shared/components/common/search-bar/search-bar.component';

/**
 * Customer Management — Admin: full access; Manager: view only, scoped to
 * their own branch server-side (see CustomerController::index()). Sellers
 * never reach this page (no sidebar entry, and the backend 403s index()).
 */
@Component({
  selector: 'app-customer-list',
  imports: [CommonModule, RouterLink, PaginationComponent, LoadingComponent, SearchBarComponent],
  templateUrl: './customer-list.component.html',
})
export class CustomerListComponent implements OnInit {
  private customerService = inject(CustomerService);

  list = new ListManager<any>((params) => this.customerService.getCustomers(params));

  ngOnInit(): void {
    this.list.load();
  }

  setSearch(value: string) {
    this.list.setFilter('search', value || undefined);
  }
}
