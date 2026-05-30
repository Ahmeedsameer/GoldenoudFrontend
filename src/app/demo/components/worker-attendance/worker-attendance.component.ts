import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../shared/components/form/label/label.component';

interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string;
  hours: number;
  status: 'present' | 'absent' | 'late';
  notes?: string;
}

@Component({
  selector: 'app-worker-attendance',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    BadgeComponent,
    ReactiveFormsModule,
    InputFieldComponent,
    LabelComponent
  ],
  templateUrl: './worker-attendance.component.html',
  // styleUrl: './worker-attendance.component.css'
})
export class WorkerAttendanceComponent implements OnInit {
  shopId: number = 0;
  selectedMonth: string = '2024-01';
  
  form: FormGroup;

  currentMonth = {
    totalDays: 30,
    presentDays: 26,
    absentDays: 2,
    lateDays: 2,
    avgHours: 8.5
  };

  attendanceData: AttendanceRecord[] = [
    { date: '2024-01-30', checkIn: '09:00', checkOut: '17:30', hours: 8, status: 'present' },
    { date: '2024-01-29', checkIn: '09:00', checkOut: '17:00', hours: 8, status: 'present' },
    { date: '2024-01-28', checkIn: '09:10', checkOut: '17:15', hours: 8, status: 'late' },
    { date: '2024-01-27', checkIn: '-', checkOut: '-', hours: 0, status: 'absent' },
    { date: '2024-01-26', checkIn: '08:55', checkOut: '17:30', hours: 8, status: 'present' },
    { date: '2024-01-25', checkIn: '09:00', checkOut: '17:00', hours: 8, status: 'present' },
    { date: '2024-01-24', checkIn: '08:50', checkOut: '17:30', hours: 8, status: 'present' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      date: ['', Validators.required],
      checkInTime: [''],
      checkOutTime: [''],
      status: ['present', Validators.required],
      notes: ['']
    });
  }

  ngOnInit() {
    this.shopId = this.route.snapshot.params['id'] || 0;
  }

  onBack() {
    this.router.navigate(['/demo/dashboard/1']);
  }

  onSaveRecord() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    alert('تم حفظ سجل الحضور');
    this.form.reset({ status: 'present' });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'present': return 'success';
      case 'late': return 'warning';
      case 'absent': return 'error';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'present': return 'حاضر';
      case 'late': return 'متأخر';
      case 'absent': return 'غائب';
      default: return status;
    }
  }
}