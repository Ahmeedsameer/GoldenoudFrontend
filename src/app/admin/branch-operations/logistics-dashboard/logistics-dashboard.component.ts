import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { LoadingComponent } from '../../../loading/loading.component';
import { ReportKpiCardComponent } from '../../../shared/components/reports/report-kpi-card/report-kpi-card.component';
import { ReportBarChartComponent } from '../../../shared/components/reports/report-charts/report-bar-chart.component';
import { ReportLineChartComponent } from '../../../shared/components/reports/report-charts/report-line-chart.component';
import { ReportLoadingSkeletonComponent } from '../../../shared/components/reports/report-loading-skeleton/report-loading-skeleton.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { BranchDashboardService, AdminLogisticsDashboardData, BranchPerformanceRow } from '../../../services/branch-dashboard.service';
import { AdminStockIntelligenceService, StockOverview } from '../../../services/admin-stock-intelligence.service';

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة', submitted: 'بانتظار الموافقة', approved: 'تمت الموافقة', rejected: 'مرفوض',
  preparing: 'قيد التجهيز', shipped: 'تم الشحن', received: 'تم الاستلام', closed: 'مغلق',
};
const REASON_LABELS: Record<string, string> = {
  broken: 'كسر', expired: 'انتهاء صلاحية', leakage: 'تسرب', lost: 'فقدان',
  damaged_during_transfer: 'تلف أثناء النقل', other: 'أخرى',
};

/** Part 11 — cross-branch logistics overview. Inventory Value Per Branch is read from the existing Stock Intelligence overview endpoint, not duplicated. */
@Component({
  selector: 'app-logistics-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, LoadingComponent, ReportKpiCardComponent, ReportBarChartComponent, ReportLineChartComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent],
  templateUrl: './logistics-dashboard.component.html',
})
export class LogisticsDashboardComponent implements OnInit {
  private svc = inject(BranchDashboardService);
  private stockSvc = inject(AdminStockIntelligenceService);

  loading = false;
  errorMsg = '';
  data: AdminLogisticsDashboardData | null = null;
  stockOverview: StockOverview | null = null;

  branchValueCategories: string[] = [];
  branchValueSeries: { name: string; data: number[] }[] = [];

  transfersPerDayCategories: string[] = [];
  transfersPerDaySeries: { name: string; data: number[] }[] = [];
  transfersPerBranchCategories: string[] = [];
  transfersPerBranchSeries: { name: string; data: number[] }[] = [];
  wasteTrendCategories: string[] = [];
  wasteTrendSeries: { name: string; data: number[] }[] = [];
  adjustmentTrendCategories: string[] = [];
  adjustmentTrendSeries: { name: string; data: number[] }[] = [];
  accuracyTrendCategories: string[] = [];
  accuracyTrendSeries: { name: string; data: number[] }[] = [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    forkJoin({
      dashboard: this.svc.getAdminLogisticsDashboard(),
      overview: this.stockSvc.getOverview(5),
    }).subscribe({
      next: ({ dashboard, overview }) => {
        this.data = dashboard;
        this.stockOverview = overview;
        this.loading = false;
        const branches = overview.by_location.filter((l) => l.shop_id != null);
        this.branchValueCategories = branches.map((l) => l.location_name);
        this.branchValueSeries = [{ name: 'قيمة المخزون', data: branches.map((l) => l.stock_value) }];
        this.buildCharts();
      },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل لوحة العمليات الإدارية'; },
    });
  }

  private buildCharts(): void {
    if (!this.data) return;
    const c = this.data.charts;

    this.transfersPerDayCategories = c.transfers_per_day.map((d) => d.date);
    this.transfersPerDaySeries = [{ name: 'التحويلات', data: c.transfers_per_day.map((d) => d.count) }];

    this.transfersPerBranchCategories = this.data.branch_performance.map((b) => b.shop_name);
    this.transfersPerBranchSeries = [
      { name: 'وارد', data: this.data.branch_performance.map((b) => b.incoming) },
      { name: 'صادر', data: this.data.branch_performance.map((b) => b.outgoing) },
    ];

    this.wasteTrendCategories = c.waste_trend.map((d) => d.date);
    this.wasteTrendSeries = [{ name: 'قيمة الهالك', data: c.waste_trend.map((d) => d.value) }];

    this.adjustmentTrendCategories = c.adjustment_trend.map((d) => d.date);
    this.adjustmentTrendSeries = [{ name: 'طلبات التسوية', data: c.adjustment_trend.map((d) => d.count) }];

    this.accuracyTrendCategories = c.inventory_count_accuracy.map((d) => d.date);
    this.accuracyTrendSeries = [{ name: 'دقة الجرد %', data: c.inventory_count_accuracy.map((d) => d.accuracy_percent ?? 0) }];
  }

  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }
  reasonLabel(r: string): string { return REASON_LABELS[r] ?? r; }

  get statusEntries(): { status: string; count: number }[] {
    if (!this.data) return [];
    return Object.entries(this.data.by_status).map(([status, count]) => ({ status, count }));
  }

  // Heat-map highlights — derived client-side from the SAME branch_performance
  // array the table renders, never a separate backend query (no duplicated APIs).
  private branchesWithValue(pick: (b: BranchPerformanceRow) => number | null): { shop_name: string; value: number }[] {
    return (this.data?.branch_performance ?? [])
      .map((b) => ({ shop_name: b.shop_name, value: pick(b) }))
      .filter((b): b is { shop_name: string; value: number } => b.value != null);
  }

  get mostRequestedBranch(): { shop_name: string; value: number } | null {
    const rows = this.branchesWithValue((b) => b.pending_requests);
    return rows.length ? rows.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  }

  get mostSendingBranchRow(): { shop_name: string; value: number } | null {
    const rows = this.branchesWithValue((b) => b.outgoing);
    return rows.length ? rows.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  }

  get highestWasteBranch(): { shop_name: string; value: number } | null {
    const rows = this.branchesWithValue((b) => b.waste_cost);
    return rows.length ? rows.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  }

  get lowestAccuracyBranch(): { shop_name: string; value: number } | null {
    const rows = this.branchesWithValue((b) => b.inventory_accuracy);
    return rows.length ? rows.reduce((a, b) => (b.value < a.value ? b : a)) : null;
  }

  get highestDelayBranch(): { shop_name: string; value: number } | null {
    const rows = this.branchesWithValue((b) => b.delayed_transfers);
    return rows.length ? rows.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  }
}
