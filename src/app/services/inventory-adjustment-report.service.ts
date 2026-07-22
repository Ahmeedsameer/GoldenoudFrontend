import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/reports/adjustments';

export interface AdjustmentReportSummary {
  period: { from: string; to: string };
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  executed_count: number;
  total_positive_qty: number;
  total_negative_qty: number;
  net_qty: number;
}

export type AdjustmentReportType = 'positive' | 'negative' | 'by-branch' | 'by-product' | 'by-employee' | 'by-reason' | 'monthly-trend';

@Injectable({ providedIn: 'root' })
export class InventoryAdjustmentReportService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  summary(from?: string, to?: string): Observable<AdjustmentReportSummary> {
    return this.http.get<any>(`${API_BASE}/summary`, { params: this.clean({ from, to }) }).pipe(map((r) => r.data));
  }

  data(type: AdjustmentReportType, from?: string, to?: string): Observable<any[]> {
    return this.http.get<any>(`${API_BASE}/${type}`, { params: this.clean({ from, to }) }).pipe(map((r) => r.data));
  }
}
