import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { TableDropdownComponent } from '../../../shared/components/common/table-dropdown/table-dropdown.component';

interface Invoice {
  id: number;
  number: string;
  customer: string;
  date: string;
  dueDate: string;
  total: number;
  status: 'paid' | 'pending' | 'overdue';
  items: number;
}

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
  
    TableDropdownComponent
  ],
  templateUrl: './invoices-list.component.html',
  // styleUrl: './invoices-list.component.css'
})
export class InvoicesListComponent {
  shopId: number = 0;
  searchTerm: string = '';
  filterStatus: string = 'all';

  invoices: Invoice[] = [
    { id: 1, number: 'INV-001', customer: 'أحمد محمد', date: '2024-01-15', dueDate: '2024-01-20', total: 1250, status: 'paid', items: 3 },
    { id: 2, number: 'INV-002', customer: 'سارة علي', date: '2024-01-15', dueDate: '2024-01-20', total: 890, status: 'pending', items: 2 },
    { id: 3, number: 'INV-003', customer: 'خالد يوسف', date: '2024-01-14', dueDate: '2024-01-19', total: 2100, status: 'paid', items: 5 },
    { id: 4, number: 'INV-004', customer: 'منى عبدالله', date: '2024-01-14', dueDate: '2024-01-19', total: 680, status: 'overdue', items: 1 },
    { id: 5, number: 'INV-005', customer: 'عبدالرحمن', date: '2024-01-13', dueDate: '2024-01-18', total: 1500, status: 'paid', items: 4 },
    { id: 6, number: 'INV-006', customer: 'فاطمة', date: '2024-01-13', dueDate: '2024-01-18', total: 450, status: 'pending', items: 1 },
    { id: 7, number: 'INV-007', customer: 'تركي', date: '2024-01-12', dueDate: '2024-01-17', total: 3200, status: 'paid', items: 8 },
    { id: 8, number: 'INV-008', customer: ' نواف', date: '2024-01-12', dueDate: '2024-01-17', total: 920, status: 'overdue', items: 2 },
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.shopId = 1;
  }

  get filteredInvoices(): Invoice[] {
    return this.invoices.filter(inv => {
      const matchSearch = !this.searchTerm || 
        inv.number.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        inv.customer.includes(this.searchTerm);
      const matchStatus = this.filterStatus === 'all' || inv.status === this.filterStatus;
      return matchSearch && matchStatus;
    });
  }

  setStatusFilter(status: string) {
    this.filterStatus = status;
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
  }

  onViewInvoice(invoice: Invoice) {
    this.router.navigate(['/demo/invoice-detail/1']);
  }

  onNewInvoice() {
    this.router.navigate(['/demo/dashboard/1']);
  }

  onBack() {
    this.router.navigate(['/demo/dashboard/1']);
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
}