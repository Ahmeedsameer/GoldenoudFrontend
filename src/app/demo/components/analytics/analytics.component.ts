import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexStroke,
  ApexFill,
  ApexMarkers,
  ApexGrid,
  ApexDataLabels,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ApexLegend,
  ApexResponsive
} from 'ng-apexcharts';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
   
    NgApexchartsModule
  ],
  templateUrl: './analytics.component.html',
  // styleUrl: './analytics.component.css'
})
export class AnalyticsComponent {
  selectedPeriod: string = 'month';

  kpis = {
    totalSales: 450000,
    totalOrders: 523,
    avgOrderValue: 860,
    topProduct: 'عطر مسك العنوان'
  };

  salesSeries: ApexAxisChartSeries = [
    {
      name: 'المبيعات',
      data: [42000, 38000, 45000, 52000, 48000, 55000, 58000, 62000, 59000, 65000, 72000, 78000]
    }
  ];

  ordersSeries: ApexAxisChartSeries = [
    {
      name: 'المبيعات',
      data: [42000, 38000, 45000, 52000, 48000, 55000, 58000, 62000, 59000, 65000, 72000, 78000]
    },
    {
      name: 'الطلبات',
      data: [35, 42, 38, 45, 52, 48, 55, 62, 58, 65, 72, 78]
    }
  ];

  chartOptions: { [key: string]: any } = {
    sales: {
      fontFamily: 'Outfit, sans-serif',
      height: 320,
      type: 'area',
      toolbar: { show: false }
    },
    colors: ['#465FFF', '#9CB9FF'],
    stroke: { curve: 'straight', width: [2, 2] },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.55, opacityTo: 0 } },
    markers: { size: 0, strokeColors: '#fff', strokeWidth: 2, hover: { size: 6 } },
    grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
    dataLabels: { enabled: false },
    tooltip: { enabled: true },
    xaxis: {
      type: 'category',
      categories: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { labels: { formatter: (val: number) => `${(val / 1000).toFixed(0)}k` } },
    legend: { show: false }
  };

  topProducts = [
    { name: 'عطر مسك العنوان', sales: 85000, percentage: 18 },
    { name: 'عطر روز وود', sales: 62000, percentage: 14 },
    { name: 'عطر أول عود', sales: 48000, percentage: 11 },
    { name: 'عطر شذي', sales: 35000, percentage: 8 },
    { name: 'عطر يمن', sales: 28000, percentage: 6 },
  ];

  constructor(private router: Router) {}

  setPeriod(period: string) {
    this.selectedPeriod = period;
  }

  onBack() {
    this.router.navigate(['/demo/dashboard/1']);
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA') + ' ر.س';
  }
}