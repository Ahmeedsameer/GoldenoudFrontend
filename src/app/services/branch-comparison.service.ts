import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/admin/reports/branch-comparison';

export interface BranchRow {
  shop_id: number; shop_name: string; invoice_count: number;
  total_revenue: number; estimated_cost: number; estimated_profit: number;
  profit_margin_percent: number | null;
  top_seller: { name: string; revenue: number } | null;
  top_oil: { name: string; qty: number } | null;
  top_bottle: { name: string; qty: number } | null;
}

export interface BranchComparison { period: { from: string; to: string }; branches: BranchRow[]; }

export interface BranchComparisonFilters { from?: string; to?: string; period?: string; }

@Injectable({ providedIn: 'root' })
export class BranchComparisonService {
  private http = inject(HttpClient);

  compare(filters: BranchComparisonFilters): Observable<BranchComparison> {
    const cleaned: Record<string, any> = {};
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return this.http.get<any>(API_BASE, { params: cleaned }).pipe(map((r) => r.data));
  }
}
