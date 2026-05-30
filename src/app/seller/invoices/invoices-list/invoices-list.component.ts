import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SalesService } from '../../../services/sales.service';
import { Invoice } from '../../../models/sales.model';
import { ListManager } from '../../../services/list-manager';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { LoadingComponent } from '../../../loading/loading.component';

@Component({
  selector: 'app-invoices-list',
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    LoadingComponent,
  ],
  templateUrl: './invoices-list.component.html',
  styleUrl: './invoices-list.component.css',
})
export class InvoicesListComponent implements OnInit {
  private salesService = inject(SalesService);
  private router = inject(Router);

  list = new ListManager<Invoice>((params) => this.salesService.getInvoices(params));

  // Filter state
  statusFilter = '';
  dateFrom = '';
  dateTo = '';

  ngOnInit(): void {
    this.list.load();
  }

  applyStatusFilter(value: string) {
    this.statusFilter = value;
    if (value) {
      this.list.setFilter('status', value);
    } else {
      this.list.filters['status'] = undefined;
      this.list.setPage(1);
    }
  }

  applyDateFrom(value: string) {
    this.dateFrom = value;
    this.list.setFilter('date_from', value || undefined);
  }

  applyDateTo(value: string) {
    this.dateTo = value;
    this.list.setFilter('date_to', value || undefined);
  }

  viewInvoice(id: number) {
    this.router.navigate(['/dashboard/invoices', id]);
  }

  statusBadgeColor(status: string): 'warning' | 'success' | 'error' {
    if (status === 'approved') return 'success';
    if (status === 'cancelled') return 'error';
    return 'warning';
  }

  statusLabel(status: string): string {
    if (status === 'approved') return 'مكتملة';
    if (status === 'cancelled') return 'ملغاة';
    return 'معلقة';
  }

  priceTypeLabel(type: string): string {
    return type === 'wholesale' ? 'جملة' : 'قطاعي';
  }
}
