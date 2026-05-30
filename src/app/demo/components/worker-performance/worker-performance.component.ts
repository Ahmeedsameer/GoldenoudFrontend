import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexStroke,
  ApexFill,
  ApexGrid,
  ApexDataLabels,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ApexLegend
} from 'ng-apexcharts';

interface WorkerPerformance {
  id: number;
  name: string;
  sales: number;
  transactions: number;
  rating: number;
}

@Component({
  selector: 'app-worker-performance',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    BadgeComponent,
    NgApexchartsModule
  ],
  templateUrl: './worker-performance.component.html',
  // styleUrl: './worker-performance.component.css'
})
export class WorkerPerformanceComponent {
  shopId: number = 0;

  workers: WorkerPerformance[] = [
    { id: 1, name: 'نورهان سعيد', sales: 125000, transactions: 156, rating: 4.8 },
    { id: 2, name: 'أمل يوسف', sales: 98000, transactions: 132, rating: 4.6 },
    { id: 3, name: 'ريهام عبدالله', sales: 87000, transactions: 118, rating: 4.5 },
    { id: 4, name: 'سلمى محمد', sales: 65000, transactions: 89, rating: 4.3 },
  ];

  chartSeries: ApexAxisChartSeries = [
    {
      name: 'المبيعات',
      data: this.workers.map(w => w.sales)
    }
  ];

  chart: ApexChart = {
    fontFamily: 'Outfit, sans-serif',
    type: 'bar',
    height: 300,
    toolbar: { show: false }
  };

  colors: string[] = ['#465fff'];

  stroke: ApexStroke = {
    show: true,
    width: 4,
    colors: ['transparent']
  };

  fill: ApexFill = { opacity: 1 };

  grid: ApexGrid = {
    yaxis: { lines: { show: true } }
  };

  dataLabels: ApexDataLabels = { enabled: false };

  tooltip: ApexTooltip = {
    y: { formatter: (val) => `${val.toLocaleString()} ر.س` }
  };

  xaxis: ApexXAxis = {
    categories: this.workers.map(w => w.name),
    axisBorder: { show: false },
    axisTicks: { show: false }
  };

  yaxis: ApexYAxis = {
    labels: {
      formatter: (val) => `${(val / 1000).toFixed(0)}k`
    }
  };

  legend: ApexLegend = { show: false };

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.shopId = this.route.snapshot.params['id'] || 0;
  }

  onBack() {
    this.router.navigate(['/demo/dashboard/1']);
  }

  getRankEmoji(index: number): string {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '';
    }
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA') + ' ر.س';
  }
}