import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/reports/stock-movement';

export interface StockMovementRow {
  date: string; type: string; type_label: string; reference_number: string;
  product_name: string; sku: string; unit: string; shop_name: string;
  source_shop_name: string | null; destination_shop_name: string | null;
  quantity_in: number; quantity_out: number; running_balance: number | null;
  unit_cost: number | null; total_value: number | null; employee: string | null; notes: string | null;
}

export interface StockMovementTypeTotal { label: string; quantity_in: number; quantity_out: number; }

export interface StockMovementReportData {
  period: { from: string; to: string };
  scoped_to_product: boolean;
  opening_balance: number | null;
  closing_balance: number | null;
  totals_by_type: Record<string, StockMovementTypeTotal>;
  kpis: { total_in: number; total_out: number; net_movement: number; current_balance: number | null };
  rows: StockMovementRow[];
  charts: {
    daily_movement: { date: string; in: number; out: number }[];
    by_category: { category: string; in: number; out: number }[];
    by_branch: { branch: string; in: number; out: number }[];
  };
}

export interface StockMovementFilters {
  from?: string; to?: string; shop_id?: number; product_id?: number; category_id?: number; supplier_id?: number;
}

@Injectable({ providedIn: 'root' })
export class StockMovementReportService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  data(filters: StockMovementFilters): Observable<StockMovementReportData> {
    return this.http.get<any>(API_BASE, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }
}
