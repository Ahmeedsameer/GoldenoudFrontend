import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LoadingComponent } from '../../loading/loading.component';

interface DashboardToday {
  revenue:       number;
  invoice_count: number;
  active_shops:  number;
  pending_count: number;
  pending_value: number;
  total_cash:    number;
}

interface DashboardCounts {
  shops:     number;
  products:  number;
  staff:     number;
  customers: number;
}

interface DashboardMonthComparison {
  this_month: number;
  last_month: number;
  change_pct: number | null;
}

interface DashboardTrendPoint {
  date:          string;
  revenue:       number;
  invoice_count: number;
}

interface DashboardTopShop {
  shop_id:       number;
  shop_name:     string;
  invoice_count: number;
  revenue:       number;
}

interface DashboardRecentInvoice {
  id:            number;
  date:          string;
  shop_name:     string;
  seller_name:   string;
  customer_name: string;
  total_amount:  number;
  status:        string;
}

interface DashboardSafeBalance {
  shop_name: string;
  type_name: string;
  is_active: boolean;
  balances:  { currency: string; symbol: string; balance: number }[];
}

interface DashboardData {
  today:            DashboardToday;
  counts:           DashboardCounts;
  month_comparison: DashboardMonthComparison;
  trend:            DashboardTrendPoint[];
  top_shops:        DashboardTopShop[];
  recent_invoices:  DashboardRecentInvoice[];
  safe_balances:    DashboardSafeBalance[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule, LoadingComponent],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private http = inject(HttpClient);

  loading  = true;
  errorMsg = '';
  data:    DashboardData | null = null;

  // ── Chart ─────────────────────────────────────────────────────────
  trendSeries:  any[] = [];
  trendOptions: any   = {
    chart: { type: 'bar', height: 220, fontFamily: 'inherit', toolbar: { show: false }, animations: { enabled: true, speed: 400 } },
    colors: ['#465fff'],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: { categories: [], labels: { style: { fontSize: '10px', colors: '#6b7280' } } },
    yaxis: { labels: { style: { fontSize: '10px', colors: '#6b7280' }, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}` } },
    grid: { strokeDashArray: 4, borderColor: '#f3f4f6' },
    tooltip: { y: { formatter: (v: number) => `${v.toLocaleString('ar-EG')} ج.م` } },
  };

  get today():   DashboardToday            { return this.data!.today; }
  get counts():  DashboardCounts           { return this.data!.counts; }
  get compare(): DashboardMonthComparison  { return this.data!.month_comparison; }
  get topShops(): DashboardTopShop[]       { return this.data!.top_shops; }
  get recentInvoices(): DashboardRecentInvoice[] { return this.data!.recent_invoices; }
  get safeBalances(): DashboardSafeBalance[] { return this.data!.safe_balances; }

  get maxTopRevenue(): number {
    return Math.max(...(this.data?.top_shops.map(s => s.revenue) ?? [1]), 1);
  }

  ngOnInit(): void {
    this.http.get<any>('http://127.0.0.1:8000/api/admin/dashboard').subscribe({
      next: (res) => {
        this.data    = res.data as DashboardData;
        this.loading = false;
        this.buildChart();
      },
      error: () => {
        this.loading  = false;
        this.errorMsg = 'فشل تحميل بيانات لوحة التحكم.';
      },
    });
  }

  private buildChart(): void {
    const trend = this.data!.trend;
    this.trendSeries  = [{ name: 'الإيرادات', data: trend.map(d => d.revenue) }];
    this.trendOptions = {
      ...this.trendOptions,
      xaxis: { ...this.trendOptions.xaxis, categories: trend.map(d => d.date) },
    };
  }

  todayDate(): string {
    return new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  statusLabel(s: string): string {
    return s === 'approved' ? 'مقبولة' : s === 'pending' ? 'معلقة' : s;
  }

  statusClass(s: string): string {
    return s === 'approved'
      ? 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
  }

  changePctClass(pct: number | null): string {
    if (pct === null) return 'text-gray-400';
    return pct >= 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400';
  }
}
