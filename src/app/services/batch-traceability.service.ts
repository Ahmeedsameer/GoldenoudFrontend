import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/reports/batches';

export interface BatchRow {
  id: number; batch_number: string; purchase_invoice: string; supplier: string | null;
  purchase_date: string | null; expiry_date: string | null; product_name: string | null; sku: string | null;
  original_quantity: number; remaining_quantity: number; reserved_quantity: number;
  transferred_quantity: number; wasted_quantity: number; sold_quantity: number; net_adjustment: number;
}

export interface BatchListMeta { current_page: number; last_page: number; total: number; per_page: number; }

export interface BatchListData { rows: BatchRow[]; meta: BatchListMeta; }

export interface BatchLocation { shop_name: string; current_quantity: number; }

export interface BatchTimelineEvent {
  date: string; type: string; type_label: string; reference_number: string;
  quantity_delta: number; shop_name: string | null; user: string | null; notes: string | null;
  running_remaining: number;
}

export interface BatchDetailData {
  batch: BatchRow;
  locations: BatchLocation[];
  timeline: BatchTimelineEvent[];
  current_remaining_quantity: number;
  untracked_gap: number;
}

export interface BatchFilters {
  product_id?: number; supplier_id?: number; shop_id?: number; from?: string; to?: string; search?: string; page?: number; per_page?: number;
}

export interface BatchSummary {
  total_batches: number; total_original_quantity: number; total_remaining_quantity: number;
  total_transferred_quantity: number; total_wasted_quantity: number; total_sold_quantity: number;
}

@Injectable({ providedIn: 'root' })
export class BatchTraceabilityService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  list(filters: BatchFilters): Observable<BatchListData> {
    return this.http.get<any>(API_BASE, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }

  summary(filters: BatchFilters): Observable<BatchSummary> {
    return this.http.get<any>(`${API_BASE}/summary`, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }

  show(id: number): Observable<BatchDetailData> {
    return this.http.get<any>(`${API_BASE}/${id}`).pipe(map((r) => r.data));
  }
}
