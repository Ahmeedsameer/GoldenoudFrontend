import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';

interface Worker {
  id: number;
  name: string;
  role: string;
  phone: string;
  salary: number;
  status: 'active' | 'inactive';
  joinDate: string;
  avatar?: string;
}

@Component({
  selector: 'app-workers-list',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    BadgeComponent
  ],
  templateUrl: './workers-list.component.html',
  // styleUrl: './workers-list.component.css'
})
export class WorkersListComponent {
  shopId: number = 0;
  searchTerm: string = '';
  filterStatus: string = 'all';

  workers: Worker[] = [
    { id: 1, name: 'نورهان سعيد', role: 'كاشير', phone: '0591234567', salary: 5000, status: 'active', joinDate: '2023-06-15' },
    { id: 2, name: 'أمل يوسف', role: 'مسؤولة معرض', phone: '0592345678', salary: 6000, status: 'active', joinDate: '2023-03-01' },
    { id: 3, name: 'ريهام عبدالله', role: 'مساعدة', phone: '0593456789', salary: 4500, status: 'active', joinDate: '2023-09-10' },
    { id: 4, name: 'سلمى محمد', role: 'كاشير', phone: '0594567890', salary: 5000, status: 'inactive', joinDate: '2023-01-20' },
  ];

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.shopId = 1;
  }

  get filteredWorkers(): Worker[] {
    return this.workers.filter(w => {
      const matchSearch = !this.searchTerm || 
        w.name.includes(this.searchTerm) ||
        w.phone.includes(this.searchTerm) ||
        w.role.includes(this.searchTerm);
      const matchStatus = this.filterStatus === 'all' || w.status === this.filterStatus;
      return matchSearch && matchStatus;
    });
  }

  setStatusFilter(status: string) {
    this.filterStatus = status;
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
  }

  onViewWorker(worker: Worker) {
    this.router.navigate(['/demo/worker-detail/1']);
  }

  onAddWorker() {
    alert('إضافة موظف جديد');
  }

  onBack() {
    this.router.navigate(['/demo/dashboard/1']);
  }

  getStatusClass(status: string): string {
    return status === 'active' ? 'success' : 'error';
  }

  getStatusLabel(status: string): string {
    return status === 'active' ? 'نشط' : 'غير نشط';
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA') + ' ر.س';
  }
}