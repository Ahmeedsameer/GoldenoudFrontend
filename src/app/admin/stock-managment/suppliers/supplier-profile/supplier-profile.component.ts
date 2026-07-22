import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LoadingComponent } from '../../../../loading/loading.component';
import {
  SupplierProfileService, SupplierProfile, SupplierProducts, SupplierAnalytics, SupplierGlobalInsights,
} from '../../../../services/supplier-profile.service';
import { ReportToolbarComponent } from '../../../../shared/components/common/report-toolbar/report-toolbar.component';

/**
 * The single professional profile screen for a supplier — general info,
 * purchase statistics, products supplied (grouped by type; Compound
 * Products never appear since they're never purchased), and trend charts.
 * Read-only aggregates over Supply/SupplyItem — never writes.
 */
@Component({
  selector: 'app-supplier-profile',
  imports: [CommonModule, RouterLink, LoadingComponent, NgApexchartsModule, ReportToolbarComponent],
  templateUrl: './supplier-profile.component.html',
})
export class SupplierProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(SupplierProfileService);

  supplierId!: number;
  loading = false;
  profile: SupplierProfile | null = null;
  products: SupplierProducts | null = null;
  analytics: SupplierAnalytics | null = null;
  insights: SupplierGlobalInsights | null = null;

  /** Is this supplier the #1 pick in any of the global rankings? */
  isBestFor(type: string): boolean {
    return this.insights?.best_supplier_by_type?.[type]?.id === this.supplierId;
  }
  get isMostFrequent(): boolean { return this.insights?.most_frequently_used?.id === this.supplierId; }
  get isLowestPrice(): boolean { return this.insights?.lowest_average_price?.id === this.supplierId; }
  get isHighestVolume(): boolean { return this.insights?.highest_purchase_volume?.id === this.supplierId; }
  get isMostStable(): boolean { return this.insights?.most_stable_pricing?.id === this.supplierId; }

  trendSeries: any[] = [];
  trendOptions: any = {
    chart: { type: 'bar', height: 240, fontFamily: 'inherit', toolbar: { show: false } },
    colors: ['#465fff'],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: { categories: [], labels: { style: { fontSize: '10px', colors: '#6b7280' } } },
    yaxis: { labels: { style: { fontSize: '10px', colors: '#6b7280' } } },
    grid: { strokeDashArray: 4, borderColor: '#f3f4f6' },
  };

  get typeGroups(): { key: 'RAW_MATERIAL' | 'PACKAGING' | 'READY_PRODUCT'; label: string; icon: string }[] {
    return [
      { key: 'RAW_MATERIAL', label: 'خامات', icon: '🛢️' },
      { key: 'PACKAGING', label: 'مستلزمات تعبئة', icon: '🧴' },
      { key: 'READY_PRODUCT', label: 'منتجات جاهزة', icon: '📦' },
    ];
  }

  ngOnInit(): void {
    this.supplierId = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.svc.profile(this.supplierId).subscribe({
      next: (p) => { this.profile = p; this.loading = false; },
      error: () => { this.loading = false; },
    });
    this.svc.products(this.supplierId).subscribe({ next: (p) => { this.products = p; }, error: () => {} });
    this.svc.analytics(this.supplierId).subscribe({
      next: (a) => {
        this.analytics = a;
        this.trendSeries = [{ name: 'قيمة المشتريات', data: a.monthly_purchase_value.map((m) => m.value) }];
        this.trendOptions = { ...this.trendOptions, xaxis: { ...this.trendOptions.xaxis, categories: a.monthly_purchase_value.map((m) => m.month) } };
      },
      error: () => {},
    });
    this.svc.globalInsights().subscribe({ next: (i) => { this.insights = i; }, error: () => {} });
  }
}
