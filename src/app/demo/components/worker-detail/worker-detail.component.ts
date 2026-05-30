import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';

interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string;
  hours: number;
  status: 'present' | 'absent' | 'late';
}

@Component({
  selector: 'app-worker-detail',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    BadgeComponent
  ],
  templateUrl: './worker-detail.component.html',
  // styleUrl: './worker-detail.component.css'
})
export class WorkerDetailComponent implements OnInit {
  workerId: number = 0;
  workerName: string = '';
  activeTab: string = 'info';

  workerData = {
    id: 1,
    name: 'نورهان سعيد',
    role: 'كاشير',
    phone: '0591234567',
    email: 'norhan@example.com',
    salary: 5000,
    status: 'active',
    joinDate: '2023-06-15',
    nationalId: '1234567890',
    address: 'الرياض، حي الازدهار',
    notes: 'موظفة متميزة في العمل'
  };

  attendanceData: AttendanceRecord[] = [
    { date: '2024-01-15', checkIn: '08:55', checkOut: '17:30', hours: 8, status: 'present' },
    { date: '2024-01-14', checkIn: '09:00', checkOut: '17:00', hours: 8, status: 'present' },
    { date: '2024-01-13', checkIn: '09:10', checkOut: '17:15', hours: 8, status: 'late' },
    { date: '2024-01-12', checkIn: '-', checkOut: '-', hours: 0, status: 'absent' },
    { date: '2024-01-11', checkIn: '08:50', checkOut: '17:30', hours: 8, status: 'present' },
    { date: '2024-01-10', checkIn: '08:55', checkOut: '17:00', hours: 8, status: 'present' },
    { date: '2024-01-09', checkIn: '09:00', checkOut: '17:30', hours: 8, status: 'present' },
  ];

  stats = {
    totalDays: 30,
    presentDays: 25,
    absentDays: 2,
    lateDays: 1,
    avgHours: 8
  };

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.workerId = this.route.snapshot.params['id'] || 0;
    this.workerName = this.route.snapshot.queryParams['workerName'] || 'الموظف';
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  onBack() {
    this.router.navigate(['/demo/workers/1']);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'success';
      case 'present': return 'success';
      case 'late': return 'warning';
      case 'absent': return 'error';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'نشط';
      case 'present': return 'حاضر';
      case 'late': return 'متأخر';
      case 'absent': return 'غائب';
      default: return status;
    }
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA') + ' ر.س';
  }

  getAttendanceStatusClass(status: string): string {
    switch (status) {
      case 'present': return 'success';
      case 'late': return 'warning';
      case 'absent': return 'error';
      default: return '';
    }
  }
}