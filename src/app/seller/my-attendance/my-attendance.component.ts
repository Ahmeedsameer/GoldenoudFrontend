import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../services/hr.service';
import { LoadingComponent } from '../../loading/loading.component';

@Component({
  selector: 'app-my-attendance',
  imports: [CommonModule, FormsModule, LoadingComponent],
  templateUrl: './my-attendance.component.html',
})
export class MyAttendanceComponent implements OnInit {
  private hr = inject(HrService);

  loading = false;
  data: { year: number; month: number; summary: any; history: any[] } | null = null;

  year = new Date().getFullYear();
  month = new Date().getMonth() + 1;

  monthNames = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  statusMeta: Record<string, { label: string; cls: string }> = {
    present:  { label: 'حاضر',     cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' },
    late:     { label: 'متأخر',    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
    half_day: { label: 'نصف يوم',  cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
    absent:   { label: 'غائب',     cls: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' },
  };

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.hr.myAttendance({ year: this.year, month: this.month }).subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  prevMonth() { this.month--; if (this.month < 1) { this.month = 12; this.year--; } this.load(); }
  nextMonth() { this.month++; if (this.month > 12) { this.month = 1; this.year++; } this.load(); }
}
