import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { ReportKpiCardComponent } from '../../../shared/components/reports/report-kpi-card/report-kpi-card.component';
import { ReportLineChartComponent } from '../../../shared/components/reports/report-charts/report-line-chart.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { ReportLoadingSkeletonComponent } from '../../../shared/components/reports/report-loading-skeleton/report-loading-skeleton.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import { MonthlyProfitService, MonthlyProfitData } from '../../../services/monthly-profit.service';
import { ShopService } from '../../../services/shop.service';

/**
 * Revenue vs. estimated cost per month, ties Sales data with the Pricing
 * module's tracked purchase_cost. "Estimated" because no COGS is captured
 * at sale time anywhere in this schema — matches Branch Comparison's method.
 *
 * First report retrofitted onto the shared reporting foundation (KPI cards,
 * chart wrapper, loading skeleton, empty state) — the template for every
 * report built after it.
 */
@Component({
  selector: 'app-monthly-profit-report',
  standalone: true,
  imports: [
    CommonModule, FormsModule, AlertComponent, ReportToolbarComponent,
    ReportKpiCardComponent, ReportLineChartComponent, ReportEmptyStateComponent, ReportLoadingSkeletonComponent, DatePickerComponent,
  ],
  templateUrl: './monthly-profit-report.component.html',
})
export class MonthlyProfitReportComponent implements OnInit {
  private svc = inject(MonthlyProfitService);
  private shopSvc = inject(ShopService);

  from = '';
  to = '';

  shops: { id: number; name: string }[] = [];
  selectedShopId: number | null = null;

  loading = false;
  errorMsg = '';
  data: MonthlyProfitData | null = null;

  chartCategories: string[] = [];
  chartSeries: { name: string; data: number[] }[] = [];

  ngOnInit(): void {
    this.shopSvc.getShops({ per_page: 200 }).subscribe({
      next: (res) => { this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); },
    });
    this.load();
  }

  get exportParams(): Record<string, any> {
    return { from: this.from || undefined, to: this.to || undefined, shop_id: this.selectedShopId };
  }

  setShop(id: number | null): void {
    this.selectedShopId = id;
    this.load();
  }

  applyRange(): void { this.load(); }

  clearRange(): void {
    this.from = ''; this.to = '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.svc.trend({ from: this.from || undefined, to: this.to || undefined, shop_id: this.selectedShopId ?? undefined }).subscribe({
      next: (d) => {
        this.data = d;
        this.loading = false;
        this.chartCategories = d.months.map((m) => m.month);
        this.chartSeries = [
          { name: 'الإيرادات', data: d.months.map((m) => m.revenue) },
          { name: 'الربح التقديري', data: d.months.map((m) => m.estimated_profit) },
        ];
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'فشل تحميل بيانات التقرير. يرجى المحاولة مرة أخرى.';
      },
    });
  }
}
