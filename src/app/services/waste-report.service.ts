import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/reports/waste';

export interface WasteReportSummary {
  period: { from: string; to: string };
  total_records: number;
  total_quantity: number;
  total_cost: number;
  top_waste_product: { id: number; name: string; qty: number } | null;
}

export type WasteReportType = 'by-product' | 'by-category' | 'by-branch' | 'by-employee' | 'by-supplier' | 'by-reason' | 'trend' | 'top-products';

@Injectable({ providedIn: 'root' })
export class WasteReportService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  summary(from?: string, to?: string): Observable<WasteReportSummary> {
    return this.http.get<any>(`${API_BASE}/summary`, { params: this.clean({ from, to }) }).pipe(map((r) => r.data));
  }

  data(type: WasteReportType, from?: string, to?: string): Observable<any[]> {
    return this.http.get<any>(`${API_BASE}/${type}`, { params: this.clean({ from, to }) }).pipe(map((r) => r.data));
  }
}
