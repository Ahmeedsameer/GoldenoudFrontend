import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/adjustments';

export type AdjustmentStatus = 'pending' | 'approved' | 'rejected' | 'executed';

export interface AdjustmentRequest {
  id: number; shop_id: number; product_id: number;
  before_quantity: number; after_quantity: number; difference: number; reason: string;
  status: AdjustmentStatus; reviewed_at: string | null; executed_at: string | null; created_at: string;
  shop?: { id: number; name: string }; product?: { id: number; name: string; sku: string | null };
  requested_by_user?: { id: number; name: string }; reviewed_by_user?: { id: number; name: string } | null;
}

export interface AdjustmentPage { data: AdjustmentRequest[]; current_page: number; last_page: number; total: number; per_page: number; }

export interface AdjustmentFilters { status?: string; shop_id?: number; page?: number; per_page?: number; }

@Injectable({ providedIn: 'root' })
export class InventoryAdjustmentService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  list(filters: AdjustmentFilters): Observable<AdjustmentPage> {
    return this.http.get<any>(API_BASE, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }

  create(payload: { shop_id: number; product_id: number; after_quantity: number; reason: string }): Observable<AdjustmentRequest> {
    return this.http.post<any>(API_BASE, payload).pipe(map((r) => r.data));
  }

  approve(id: number): Observable<AdjustmentRequest> { return this.http.post<any>(`${API_BASE}/${id}/approve`, {}).pipe(map((r) => r.data)); }
  reject(id: number): Observable<AdjustmentRequest> { return this.http.post<any>(`${API_BASE}/${id}/reject`, {}).pipe(map((r) => r.data)); }
  execute(id: number): Observable<AdjustmentRequest> { return this.http.post<any>(`${API_BASE}/${id}/execute`, {}).pipe(map((r) => r.data)); }
}
