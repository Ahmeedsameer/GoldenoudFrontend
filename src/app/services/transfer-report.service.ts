import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/reports/transfers';

export interface TransferReportSummary {
  period: { from: string; to: string };
  total_transfers: number;
  open_transfers: number;
  closed_transfers: number;
  rejected_transfers: number;
  avg_approval_minutes: number | null;
  avg_shipping_minutes: number | null;
  avg_receiving_minutes: number | null;
  success_rate_percent: number | null;
  warehouse: {
    total_requests: number; response_time_minutes: number | null; shipping_time_minutes: number | null; service_level_percent: number | null;
  } | null;
}

export type TransferReportType =
  | 'by-branch' | 'by-product' | 'by-category' | 'by-manager' | 'by-employee' | 'by-type'
  | 'delayed' | 'pending' | 'closed' | 'emergency' | 'internal-invoices' | 'damaged' | 'missing'
  | 'partial-receipts' | 'invoice-awaiting-receipt' | 'invoice-completed'
  | 'warehouse-outgoing' | 'warehouse-distribution' | 'most-requested-products' | 'least-requested-products';

@Injectable({ providedIn: 'root' })
export class TransferReportService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  summary(from?: string, to?: string): Observable<TransferReportSummary> {
    return this.http.get<any>(`${API_BASE}/summary`, { params: this.clean({ from, to }) }).pipe(map((r) => r.data));
  }

  data(type: TransferReportType, from?: string, to?: string): Observable<any[]> {
    return this.http.get<any>(`${API_BASE}/${type}`, { params: this.clean({ from, to }) }).pipe(map((r) => r.data));
  }
}
