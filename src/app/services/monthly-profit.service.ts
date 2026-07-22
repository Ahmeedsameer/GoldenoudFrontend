import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/admin/reports/monthly-profit';

export interface MonthlyProfitRow {
  month: string; revenue: number; estimated_cost: number;
  estimated_profit: number; profit_margin_percent: number | null;
}

export interface MonthlyProfitTotals {
  revenue: number; estimated_cost: number; estimated_profit: number; profit_margin_percent: number | null;
}

export interface MonthlyProfitData {
  period: { from: string; to: string };
  months: MonthlyProfitRow[];
  totals: MonthlyProfitTotals;
}

export interface MonthlyProfitFilters { from?: string; to?: string; shop_id?: number; }

@Injectable({ providedIn: 'root' })
export class MonthlyProfitService {
  private http = inject(HttpClient);

  trend(filters: MonthlyProfitFilters): Observable<MonthlyProfitData> {
    const cleaned: Record<string, any> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return this.http.get<any>(API_BASE, { params: cleaned }).pipe(map((r) => r.data));
  }
}
