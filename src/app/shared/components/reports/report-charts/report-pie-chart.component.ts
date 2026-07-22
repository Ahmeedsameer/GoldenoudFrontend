import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';

/** The one pie/donut wrapper every report uses — e.g. inventory value by category, stock distribution. */
@Component({
  selector: 'app-report-pie-chart',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      @if (title) { <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{{ title }}</h2> }
      @if (series.length && labels.length) {
        <apx-chart [series]="series" [chart]="chart" [colors]="colors" [labels]="labels"
          [dataLabels]="dataLabels" [legend]="legend" [responsive]="responsive" />
      } @else {
        <p class="text-sm text-gray-400 text-center py-10">لا توجد بيانات كافية لعرض الرسم البياني</p>
      }
    </div>
  `,
})
export class ReportPieChartComponent implements OnChanges {
  @Input() title = '';
  @Input() labels: string[] = [];
  @Input() series: number[] = [];
  @Input() colors: string[] = ['#465fff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  @Input() height = 280;
  @Input() donut = true;

  chart: any = { type: 'donut', height: this.height, fontFamily: 'inherit' };
  dataLabels: any = { enabled: true, style: { fontSize: '11px' } };
  legend: any = { position: 'bottom', fontSize: '12px' };
  responsive: any = [{ breakpoint: 480, options: { chart: { width: 260 }, legend: { position: 'bottom' } } }];

  ngOnChanges(): void {
    this.chart = { ...this.chart, type: this.donut ? 'donut' : 'pie', height: this.height };
  }
}
