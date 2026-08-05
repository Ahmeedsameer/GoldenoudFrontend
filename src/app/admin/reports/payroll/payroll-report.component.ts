import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../services/hr.service';
import { ShopService } from '../../../services/shop.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';

/** Payroll Report — reuses the exact ReportExportService/report-toolbar pattern every other report already uses. */
@Component({
  selector: 'app-payroll-report',
  imports: [CommonModule, FormsModule, LoadingComponent, ReportToolbarComponent],
  templateUrl: './payroll-report.component.html',
})
export class PayrollReportComponent implements OnInit {
  private hr = inject(HrService);
  private shopSvc = inject(ShopService);

  loading = false;
  rows: any[] = [];

  now = new Date();
  year = this.now.getFullYear();
  month: number | null = this.now.getMonth() + 1;
  months = Array.from({ length: 12 }, (_, i) => i + 1);
  years = [this.now.getFullYear() - 1, this.now.getFullYear(), this.now.getFullYear() + 1];
  shopId: number | null = null;
  status = '';

  shops: { id: number; name: string }[] = [];

  get filters(): Record<string, any> {
    return { year: this.year, month: this.month ?? undefined, shop_id: this.shopId ?? undefined, status: this.status || undefined };
  }

  get totalNet(): number { return this.rows.reduce((s, r) => s + (r.net_salary || 0), 0); }

  ngOnInit(): void {
    this.shopSvc.getShops({ per_page: 200 }).subscribe({ next: (res) => { this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.hr.getPayrollReport(this.filters).subscribe({
      next: (rows) => { this.rows = rows; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
