import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { ComponentCardComponent } from '../../../shared/components/common/component-card/component-card.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { TableComponent } from '../../../shared/components/ui/table/table.component';
import { TableHeaderComponent } from '../../../shared/components/ui/table/table-header.component';
import { TableBodyComponent } from '../../../shared/components/ui/table/table-body.component';
import { TableRowComponent } from '../../../shared/components/ui/table/table-row.component';
import { TableCellComponent } from '../../../shared/components/ui/table/table-cell.component';

interface Invoice {
  id: number;
  number: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

interface Stats {
  todaySales: number;
  monthSales: number;
  totalInvoices: number;
  pendingAmount: number;
}

@Component({
  selector: 'app-shop-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ComponentCardComponent,
    ButtonComponent,
    BadgeComponent,
    TableComponent,
    TableHeaderComponent,
    TableBodyComponent,
    TableRowComponent,
    TableCellComponent
  ],
  templateUrl: './shop-dashboard.component.html',
  // styleUrl: './shop-dashboard.component.css'
})
export class ShopDashboardComponent {
  shopId: number = 0;
  shopName: string = '';

  stats: Stats = {
    todaySales: 12500,
    monthSales: 187500,
    totalInvoices: 342,
    pendingAmount: 15750
  };

  recentInvoices: Invoice[] = [
    { id: 1, number: 'INV-2024-001', date: '2024-01-15', amount: 2500, status: 'paid' },
    { id: 2, number: 'INV-2024-002', date: '2024-01-15', amount: 1800, status: 'pending' },
    { id: 3, number: 'INV-2024-003', date: '2024-01-14', amount: 3200, status: 'paid' },
    { id: 4, number: 'INV-2024-004', date: '2024-01-14', amount: 950, status: 'overdue' },
    { id: 5, number: 'INV-2024-005', date: '2024-01-13', amount: 4100, status: 'paid' },
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.shopId = this.route.snapshot.params['id'] || 0;
    this.shopName = this.route.snapshot.queryParams['shopName'] || 'المحل';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'overdue': return 'error';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'paid': return 'مدفوع';
      case 'pending': return 'معلق';
      case 'overdue': return 'متأخر';
      default: return status;
    }
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA') + ' ر.س';
  }

  onNavigate(path: string) {
    this.router.navigate([`/demo/${path}/1`]);
  }
}