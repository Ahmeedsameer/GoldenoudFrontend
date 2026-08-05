import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../services/hr.service';
import { SafeService } from '../../../services/safe.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';

/** Salary Payment Report — every real `salary_payment` SafeTransaction, reusing ReportExportService like every other report. */
@Component({
  selector: 'app-salary-payment-report',
  imports: [CommonModule, FormsModule, LoadingComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './salary-payment-report.component.html',
})
export class SalaryPaymentReportComponent implements OnInit {
  private hr = inject(HrService);
  private safeSvc = inject(SafeService);

  loading = false;
  rows: any[] = [];

  from = '';
  to = '';
  safeId: number | null = null;

  safes: any[] = [];

  get filters(): Record<string, any> {
    return { from: this.from || undefined, to: this.to || undefined, safe_id: this.safeId ?? undefined };
  }

  get totalAmount(): number { return this.rows.reduce((s, r) => s + (r.amount || 0), 0); }

  safeLabel(safe: any): string {
    const location = safe.shop ? safe.shop.name : 'الشركة';
    return `${safe.safe_type?.name || 'خزنة'} — ${location}`;
  }

  ngOnInit(): void {
    this.safeSvc.getSafes().subscribe({ next: (r) => { this.safes = r.data || []; } });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.hr.getSalaryPaymentReport(this.filters).subscribe({
      next: (rows) => { this.rows = rows; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
