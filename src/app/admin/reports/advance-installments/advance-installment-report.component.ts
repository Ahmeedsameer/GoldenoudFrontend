import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../services/hr.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';

const STATUS_LABELS: Record<string, string> = { pending: 'قيد الانتظار', due: 'مستحق', paid: 'مدفوع', skipped: 'متجاوز', cancelled: 'ملغى' };

/** Advance Installments Report — per-installment detail (the Advances Report covers whole advances only). */
@Component({
  selector: 'app-advance-installment-report',
  imports: [CommonModule, FormsModule, LoadingComponent, ReportToolbarComponent],
  templateUrl: './advance-installment-report.component.html',
})
export class AdvanceInstallmentReportComponent implements OnInit {
  private hr = inject(HrService);

  loading = false;
  rows: any[] = [];

  now = new Date();
  year: number | null = this.now.getFullYear();
  month: number | null = this.now.getMonth() + 1;
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  years = [this.now.getFullYear() - 1, this.now.getFullYear(), this.now.getFullYear() + 1];
  status = '';

  statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

  get filters(): Record<string, any> {
    return { year: this.year ?? undefined, month: this.month ?? undefined, status: this.status || undefined };
  }

  get totalAmount(): number { return this.rows.reduce((s, r) => s + (r.amount || 0), 0); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.hr.getAdvanceInstallmentReport(this.filters).subscribe({
      next: (rows) => { this.rows = rows; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
