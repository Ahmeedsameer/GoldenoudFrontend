import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/counts';

export type CountSessionStatus = 'counting' | 'review' | 'approved' | 'completed';

export interface CountItem {
  id: number; product_id: number; system_quantity: number;
  physical_quantity: number | null; difference: number | null; reason: string | null;
  product?: { id: number; name: string; sku: string | null; scalar: string | null };
}

export interface CountSession {
  id: number; shop_id: number; status: CountSessionStatus; notes: string | null; created_at: string;
  shop?: { id: number; name: string }; created_by_user?: { id: number; name: string };
  employees?: { id: number; name: string }[]; items: CountItem[]; items_count?: number;
}

export interface CountSessionPage { data: CountSession[]; current_page: number; last_page: number; total: number; per_page: number; }

export interface CountFilters { status?: string; shop_id?: number; page?: number; per_page?: number; }

@Injectable({ providedIn: 'root' })
export class InventoryCountService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  list(filters: CountFilters): Observable<CountSessionPage> {
    return this.http.get<any>(API_BASE, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }

  get(id: number): Observable<CountSession> {
    return this.http.get<any>(`${API_BASE}/${id}`).pipe(map((r) => r.data));
  }

  create(payload: { shop_id: number; employee_ids?: number[]; notes?: string }): Observable<CountSession> {
    return this.http.post<any>(API_BASE, payload).pipe(map((r) => r.data));
  }

  recordCounts(id: number, items: { item_id: number; physical_quantity: number }[]): Observable<CountSession> {
    return this.http.post<any>(`${API_BASE}/${id}/record`, { items }).pipe(map((r) => r.data));
  }

  submitForReview(id: number): Observable<CountSession> {
    return this.http.post<any>(`${API_BASE}/${id}/submit-review`, {}).pipe(map((r) => r.data));
  }

  setItemReason(id: number, itemId: number, reason: string): Observable<CountItem> {
    return this.http.put<any>(`${API_BASE}/${id}/items/${itemId}/reason`, { reason }).pipe(map((r) => r.data));
  }

  approve(id: number): Observable<CountSession> {
    return this.http.post<any>(`${API_BASE}/${id}/approve`, {}).pipe(map((r) => r.data));
  }

  adjustInventory(id: number): Observable<CountSession> {
    return this.http.post<any>(`${API_BASE}/${id}/adjust-inventory`, {}).pipe(map((r) => r.data));
  }
}
