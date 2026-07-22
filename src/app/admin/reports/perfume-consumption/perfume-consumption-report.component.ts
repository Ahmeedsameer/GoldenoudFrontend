import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import {
  PerfumeReportService, PerfumeConsumptionSummary, PerfumeTrendRow,
} from '../../../services/perfume-report.service';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';

type Period = 'today' | 'week' | 'month' | 'year';

/**
 * How much of each oil and each bottle was actually used across real
 * Compound Product sales — never a stored recipe, always derived from
 * invoice_items.role = 'oil'|'bottle' on approved invoices.
 */
@Component({
  selector: 'app-perfume-consumption-report',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule, LoadingComponent, AlertComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './perfume-consumption-report.component.html',
})
export class PerfumeConsumptionReportComponent implements OnInit {
  private svc = inject(PerfumeReportService);

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

  summary: PerfumeConsumptionSummary | null = null;
  trendData: PerfumeTrendRow[] = [];

  oilsSearch = '';
  bottlesSearch = '';

  trendSeries: any[] = [];
  trendOptions: any = {
    chart: { type: 'bar', height: 260, fontFamily: 'inherit', toolbar: { show: false } },
    colors: ['#9A7B1A', '#465fff'],
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

  get exportParamsOil(): Record<string, any> { return { ...this.filters(), type: 'oil' }; }
  get exportParamsBottle(): Record<string, any> { return { ...this.filters(), type: 'bottle' }; }

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
    forkJoin({
      summary: this.svc.summary(this.filters()),
      trend: this.svc.trend(this.filters()),
    }).subscribe({
      next: ({ summary, trend }) => {
        this.summary = summary;
        this.trendData = trend;
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
    this.trendSeries = [
      { name: 'استهلاك الزيوت', data: this.trendData.map((d) => d.oil_qty) },
      { name: 'استهلاك الزجاجات', data: this.trendData.map((d) => d.bottle_qty) },
    ];
    this.trendOptions = { ...this.trendOptions, xaxis: { ...this.trendOptions.xaxis, categories: this.trendData.map((d) => d.month) } };
  }

  get filteredOils() {
    const q = this.oilsSearch.trim().toLowerCase();
    const rows = this.summary?.oils ?? [];
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q) || (r.sku ?? '').toLowerCase().includes(q)) : rows;
  }

  get filteredBottles() {
    const q = this.bottlesSearch.trim().toLowerCase();
    const rows = this.summary?.bottles ?? [];
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q) || (r.sku ?? '').toLowerCase().includes(q)) : rows;
  }
}
