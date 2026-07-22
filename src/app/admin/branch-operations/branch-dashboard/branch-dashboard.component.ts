import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LoadingComponent } from '../../../loading/loading.component';
import { ReportKpiCardComponent } from '../../../shared/components/reports/report-kpi-card/report-kpi-card.component';
import { ReportLoadingSkeletonComponent } from '../../../shared/components/reports/report-loading-skeleton/report-loading-skeleton.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { ReportBarChartComponent } from '../../../shared/components/reports/report-charts/report-bar-chart.component';
import { ReportLineChartComponent } from '../../../shared/components/reports/report-charts/report-line-chart.component';
import { BranchDashboardService, BranchDashboardData } from '../../../services/branch-dashboard.service';
import { AdminStockIntelligenceService, StockOverview, LowStockRow } from '../../../services/admin-stock-intelligence.service';
import { ShopService } from '../../../services/shop.service';
import { AuthService } from '../../../services/auth.service';

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة', submitted: 'بانتظار الموافقة', approved: 'تمت الموافقة', rejected: 'مرفوض',
  preparing: 'قيد التجهيز', shipped: 'تم الشحن', received: 'تم الاستلام', closed: 'مغلق',
};

/**
 * Part 10 — a single branch's operations at a glance. Low Stock and
 * Inventory Value are read straight from the existing Stock Intelligence
 * endpoints (already per-shop) rather than duplicated here.
 */
@Component({
  selector: 'app-branch-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportBarChartComponent, ReportLineChartComponent],
  templateUrl: './branch-dashboard.component.html',
})
export class BranchDashboardComponent implements OnInit {
  private svc = inject(BranchDashboardService);
  private stockSvc = inject(AdminStockIntelligenceService);
  private shopSvc = inject(ShopService);
  private auth = inject(AuthService);

  loading = false;
  errorMsg = '';
  data: BranchDashboardData | null = null;
  stockOverview: StockOverview | null = null;
  lowStock: LowStockRow[] = [];

  shops: { id: number; name: string }[] = [];
  selectedShopId: number | null = null;

  transfersWeekCategories: string[] = [];
  transfersWeekSeries: { name: string; data: number[] }[] = [];
  wasteTrendCategories: string[] = [];
  wasteTrendSeries: { name: string; data: number[] }[] = [];
  accuracyTrendCategories: string[] = [];
  accuracyTrendSeries: { name: string; data: number[] }[] = [];

  get isManager(): boolean { return this.auth.getUserRole() === 'manager'; }
  get shopName(): string { return this.shops.find((s) => s.id === this.selectedShopId)?.name ?? ''; }

  ngOnInit(): void {
    const userShopId = this.auth.getUser()?.shop_id ?? null;

    this.shopSvc.getShops({ per_page: 200 }).subscribe({
      next: (res) => {
        this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name }));
        if (!this.selectedShopId && this.shops.length && !(this.isManager && userShopId)) {
          this.selectedShopId = this.shops[0].id;
          this.load();
        }
      },
    });

    if (this.isManager && userShopId) {
      this.selectedShopId = userShopId;
      this.load();
    }
  }

  setShop(id: number): void {
    this.selectedShopId = id;
    this.load();
  }

  load(): void {
    if (!this.selectedShopId) return;
    this.loading = true;
    this.errorMsg = '';
    forkJoin({
      dashboard: this.svc.getBranchDashboard(this.selectedShopId),
      overview: this.stockSvc.getOverview(5, this.selectedShopId),
      lowStock: this.stockSvc.getLowStock(5, this.selectedShopId),
    }).subscribe({
      next: ({ dashboard, overview, lowStock }) => {
        this.data = dashboard;
        this.stockOverview = overview;
        this.lowStock = lowStock.items;
        this.loading = false;
        this.buildCharts();
      },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل بيانات لوحة الفرع'; },
    });
  }

  private buildCharts(): void {
    if (!this.data) return;
    const c = this.data.charts;

    this.transfersWeekCategories = c.transfers_this_week.map((d) => d.date);
    this.transfersWeekSeries = [{ name: 'التحويلات', data: c.transfers_this_week.map((d) => d.count) }];

    this.wasteTrendCategories = c.waste_trend.map((d) => d.date);
    this.wasteTrendSeries = [{ name: 'قيمة الهالك', data: c.waste_trend.map((d) => d.value) }];

    this.accuracyTrendCategories = c.inventory_accuracy_trend.map((d) => d.date);
    this.accuracyTrendSeries = [{ name: 'دقة الجرد %', data: c.inventory_accuracy_trend.map((d) => d.accuracy_percent ?? 0) }];
  }

  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }
}
