import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/admin/reports/perfume';

export interface ConsumptionRow {
  id: number; name: string; sku: string | null;
  total_qty: number; usage_count: number; revenue_value: number;
}

export interface PerfumeConsumptionSummary {
  period: { from: string; to: string };
  compound_sales_count: number;
  oils: ConsumptionRow[];
  bottles: ConsumptionRow[];
  total_oil_qty: number; total_bottle_qty: number;
  total_oil_revenue: number; total_bottle_revenue: number;
}

export interface PerfumeTrendRow { month: string; oil_qty: number; bottle_qty: number; }

export interface PerfumeReportFilters { from?: string; to?: string; period?: string; shop_id?: number; }

@Injectable({ providedIn: 'root' })
export class PerfumeReportService {
  private http = inject(HttpClient);

  private clean(params: PerfumeReportFilters): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  summary(filters: PerfumeReportFilters): Observable<PerfumeConsumptionSummary> {
    return this.http.get<any>(`${API_BASE}/summary`, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }

  trend(filters: PerfumeReportFilters): Observable<PerfumeTrendRow[]> {
    return this.http.get<any>(`${API_BASE}/trend`, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }
}
