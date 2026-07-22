import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/reports/counts';

export interface InventoryCountReportSummary {
  period: { from: string; to: string };
  total_sessions: number;
  approved_sessions: number;
  pending_sessions: number;
  total_items_counted: number;
  overall_accuracy_percent: number | null;
}

export type InventoryCountReportType =
  | 'sessions' | 'branch-accuracy' | 'employee-accuracy' | 'product-variance'
  | 'biggest-differences' | 'accuracy-trend' | 'approved' | 'pending';

@Injectable({ providedIn: 'root' })
export class InventoryCountReportService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  summary(from?: string, to?: string): Observable<InventoryCountReportSummary> {
    return this.http.get<any>(`${API_BASE}/summary`, { params: this.clean({ from, to }) }).pipe(map((r) => r.data));
  }

  data(type: InventoryCountReportType, from?: string, to?: string): Observable<any[]> {
    return this.http.get<any>(`${API_BASE}/${type}`, { params: this.clean({ from, to }) }).pipe(map((r) => r.data));
  }
}
