import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../services/hr.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';

/** Leave Deductions Report — reads the payroll_lines rows PayrollService's computeComponents() already wrote; never recomputes. */
@Component({
  selector: 'app-leave-deduction-report',
  imports: [CommonModule, FormsModule, LoadingComponent, ReportToolbarComponent],
  templateUrl: './leave-deduction-report.component.html',
})
export class LeaveDeductionReportComponent implements OnInit {
  private hr = inject(HrService);

  loading = false;
  rows: any[] = [];

  now = new Date();
  year: number | null = this.now.getFullYear();
  month: number | null = this.now.getMonth() + 1;
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  years = [this.now.getFullYear() - 1, this.now.getFullYear(), this.now.getFullYear() + 1];

  get filters(): Record<string, any> {
    return { year: this.year ?? undefined, month: this.month ?? undefined };
  }

  get totalAmount(): number { return this.rows.reduce((s, r) => s + (r.amount || 0), 0); }
  get totalDays(): number { return this.rows.reduce((s, r) => s + (r.unpaid_days || 0), 0); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.hr.getLeaveDeductionReport(this.filters).subscribe({
      next: (rows) => { this.rows = rows; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
