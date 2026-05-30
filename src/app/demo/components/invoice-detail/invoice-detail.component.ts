import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';

interface InvoiceItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceDetail {
  id: number;
  number: string;
  customer: string;
  customerPhone?: string;
  date: string;
  dueDate: string;
  total: number;
  status: 'paid' | 'pending' | 'overdue';
  items: InvoiceItem[];
  notes?: string;
}

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
   
  ],
  templateUrl: './invoice-detail.component.html',
  // styleUrl: './invoice-detail.component.css'
})
export class InvoiceDetailComponent implements OnInit {
  invoiceId: number = 0;
  invoice: InvoiceDetail | null = null;

  invoiceData: InvoiceDetail = {
    id: 1,
    number: 'INV-001',
    customer: 'أحمد محمد',
    customerPhone: '0591234567',
    date: '2024-01-15',
    dueDate: '2024-01-20',
    total: 1250,
    status: 'paid',
    items: [
      { id: 1, name: 'عطر مسك العنوان', quantity: 2, price: 350, total: 700 },
      { id: 2, name: 'عطر روز وود', quantity: 1, price: 320, total: 320 },
      { id: 3, name: 'كريمة_body', quantity: 1, price: 230, total: 230 },
    ],
    notes: 'شكراً لتعاملكم معنا'
  };

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.invoiceId = this.route.snapshot.params['id'] || 0;
    this.invoice = this.invoiceData;
  }

  onPrint() {
    window.print();
  }

  onBack() {
    this.router.navigate(['/demo/invoices/1']);
  }

  calculateSubtotal(): number {
    if (!this.invoice) return 0;
    return this.invoice.items.reduce((sum, item) => sum + item.total, 0);
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA') + ' ر.س';
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
}