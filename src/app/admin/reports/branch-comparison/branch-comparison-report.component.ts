import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { BranchComparisonService, BranchComparison } from '../../../services/branch-comparison.service';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';

type Period = 'today' | 'week' | 'month' | 'year';

/**
 * Side-by-side comparison of every branch's revenue, estimated profit, top
 * seller, and top oil/bottle used — for the selected period. "Estimated
 * profit" uses each product's current purchase_cost, not a historical COGS
 * figure (none is captured at sale time anywhere in this schema).
 */
@Component({
  selector: 'app-branch-comparison-report',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule, LoadingComponent, AlertComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './branch-comparison-report.component.html',
})
export class BranchComparisonReportComponent implements OnInit {
  private svc = inject(BranchComparisonService);

  period: Period = 'month';
  periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'اليوم' }, { key: 'week', label: 'الأسبوع' },
    { key: 'month', label: 'الشهر' }, { key: 'year', label: 'السنة' },
  ];

  showCustomPicker = false;
  from = '';
  to = '';
  customRangeActive = false;

  loading = false;
  errorMsg = '';
  data: BranchComparison | null = null;

  revenueSeries: any[] = [];
  revenueOptions: any = {
    chart: { type: 'bar', height: 260, fontFamily: 'inherit', toolbar: { show: false } },
    colors: ['#465fff', '#10b981'],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 3 } },
    dataLabels: { enabled: false },
    xaxis: { categories: [], labels: { style: { fontSize: '10px', colors: '#6b7280' } } },
    yaxis: { labels: { style: { fontSize: '10px', colors: '#6b7280' } } },
    grid: { strokeDashArray: 4, borderColor: '#f3f4f6' },
    legend: { position: 'top' },
  };

  ngOnInit(): void { this.load(); }

  private filters() {
    if (this.customRangeActive && this.from && this.to) return { from: this.from, to: this.to };
    return { period: this.period };
  }

  get exportParams(): Record<string, any> { return this.filters(); }

  setPeriod(p: Period): void {
    this.period = p;
    this.customRangeActive = false;
    this.from = ''; this.to = '';
    this.showCustomPicker = false;
    this.load();
  }

  applyRange(): void {
    if (!this.from || !this.to) return;
    this.customRangeActive = true;
    this.showCustomPicker = false;
    this.load();
  }

  clearRange(): void {
    this.from = ''; this.to = '';
    this.customRangeActive = false;
    this.showCustomPicker = false;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.svc.compare(this.filters()).subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
        this.buildChart();
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'فشل تحميل بيانات التقرير. يرجى المحاولة مرة أخرى.';
      },
    });
  }

  private buildChart(): void {
    const branches = this.data?.branches ?? [];
    this.revenueSeries = [
      { name: 'الإيرادات', data: branches.map((b) => b.total_revenue) },
      { name: 'الربح التقديري', data: branches.map((b) => b.estimated_profit) },
    ];
    this.revenueOptions = { ...this.revenueOptions, xaxis: { ...this.revenueOptions.xaxis, categories: branches.map((b) => b.shop_name) } };
  }
}
