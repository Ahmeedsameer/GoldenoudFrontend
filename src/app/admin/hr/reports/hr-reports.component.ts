import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../services/hr.service';
import { ShopService } from '../../../services/shop.service';
import { LoadingComponent } from '../../../loading/loading.component';

@Component({
  selector: 'app-hr-reports',
  imports: [CommonModule, FormsModule, LoadingComponent],
  templateUrl: './hr-reports.component.html',
})
export class HrReportsComponent implements OnInit {
  private hr = inject(HrService);
  private shopService = inject(ShopService);

  loading = false;
  exporting = false;
  report: any = null;

  shops: { id: number; name: string }[] = [];
  now = new Date();

  reportTypes = [
    { value: 'employee_sales',     label: 'مبيعات الموظفين',           filters: ['from', 'to'] },
    { value: 'branch_sales',       label: 'مبيعات الفروع',             filters: ['from', 'to'] },
    { value: 'commissions',        label: 'العمولات والبونص',          filters: ['from', 'to'] },
    { value: 'top_performers',     label: 'أفضل الموظفين أداءً',        filters: ['from', 'to'] },
    { value: 'branch_performance', label: 'أداء الفروع',               filters: ['from', 'to'] },
    { value: 'attendance',         label: 'الحضور',                    filters: ['from', 'to', 'shop_id'] },
    { value: 'leaves',             label: 'الإجازات',                  filters: ['year', 'status_leave'] },
    { value: 'payroll',            label: 'الرواتب',                   filters: ['year', 'month'] },
    { value: 'monthly_comparison', label: 'المقارنة الشهرية',          filters: ['year'] },
    { value: 'transfers',          label: 'نقل الموظفين',              filters: ['status_transfer', 'shop_id'] },
    { value: 'transfer_earnings',  label: 'المبيعات والبونص خلال النقل', filters: [] },
  ];

  type = 'employee_sales';
  filters: any = {
    from: this.iso(new Date(this.now.getFullYear(), this.now.getMonth(), 1)),
    to: this.iso(new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0)),
    year: this.now.getFullYear(),
    month: this.now.getMonth() + 1,
    shop_id: '',
    status_leave: '',
    status_transfer: '',
  };

  months = Array.from({ length: 12 }, (_, i) => i + 1);
  years = [this.now.getFullYear() - 1, this.now.getFullYear(), this.now.getFullYear() + 1];

  ngOnInit(): void {
    this.shopService.getShops({ page: -1 }).subscribe({ next: (r) => this.shops = r.data?.data || r.data || r || [], error: () => {} });
    this.run();
  }

  get activeFilters(): string[] {
    return this.reportTypes.find((r) => r.value === this.type)?.filters || [];
  }

  private iso(d: Date) { return d.toISOString().substring(0, 10); }

  private buildParams(): any {
    const f = this.activeFilters;
    const p: any = {};
    if (f.includes('from')) { p.from = this.filters.from; p.to = this.filters.to; }
    if (f.includes('year')) p.year = this.filters.year;
    if (f.includes('month')) p.month = this.filters.month;
    if (f.includes('shop_id') && this.filters.shop_id) p.shop_id = this.filters.shop_id;
    if (f.includes('status_leave') && this.filters.status_leave) p.status = this.filters.status_leave;
    if (f.includes('status_transfer') && this.filters.status_transfer) p.status = this.filters.status_transfer;
    return p;
  }

  run() {
    this.loading = true;
    this.hr.getReport(this.type, this.buildParams()).subscribe({
      next: (d) => { this.report = d; this.loading = false; },
      error: () => { this.report = null; this.loading = false; },
    });
  }

  onTypeChange() { this.report = null; this.run(); }

  download(format: 'csv' | 'pdf') {
    this.exporting = true;
    this.hr.exportReport(this.type, this.buildParams(), format).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.type}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting = false;
      },
      error: () => { this.exporting = false; },
    });
  }
}
