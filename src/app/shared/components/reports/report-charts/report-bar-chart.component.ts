import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';

/**
 * The one bar-chart wrapper every report uses — pass categories + one or
 * more named series, get the same axis styling, grid, and colors everywhere.
 * No report builds its own ApexCharts options object from scratch.
 */
@Component({
  selector: 'app-report-bar-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      @if (title) { <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{{ title }}</h2> }
      @if (series.length && categories.length) {
        <apx-chart [series]="series" [chart]="chart" [colors]="colors"
          [plotOptions]="plotOptions" [dataLabels]="dataLabels"
          [xaxis]="xaxis" [yaxis]="yaxisOptions" [grid]="grid" [legend]="legend" />
      } @else {
        <p class="text-sm text-gray-400 text-center py-10">لا توجد بيانات كافية لعرض الرسم البياني</p>
      }
    </div>
  `,
})
export class ReportBarChartComponent implements OnChanges {
  @Input() title = '';
  @Input() categories: (string | number)[] = [];
  @Input() series: { name: string; data: number[] }[] = [];
  @Input() colors: string[] = ['#465fff', '#10b981', '#f59e0b'];
  @Input() height = 260;

  chart: any = { type: 'bar', height: this.height, fontFamily: 'inherit', toolbar: { show: false } };
  plotOptions: any = { bar: { columnWidth: '55%', borderRadius: 3 } };
  dataLabels: any = { enabled: false };
  xaxis: any = { categories: [], labels: { style: { fontSize: '10px', colors: '#6b7280' } } };
  yaxisOptions: any = { labels: { style: { fontSize: '10px', colors: '#6b7280' } } };
  grid: any = { strokeDashArray: 4, borderColor: '#f3f4f6' };
  legend: any = { position: 'top' };

  ngOnChanges(): void {
    this.chart = { ...this.chart, height: this.height };
    this.xaxis = { ...this.xaxis, categories: this.categories };
  }
}
