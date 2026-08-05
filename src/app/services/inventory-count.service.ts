import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';

const API_BASE = `${environment.apiBaseUrl}/branch-operations/counts`;

export type CountSessionStatus = 'counting' | 'review' | 'approved' | 'completed';

export type ReasonType =
  | 'broken' | 'damaged' | 'theft' | 'sale_not_recorded'
  | 'purchase_not_recorded' | 'transfer_issue' | 'counting_mistake' | 'other';

export const REASON_TYPES: ReasonType[] = [
  'broken', 'damaged', 'theft', 'sale_not_recorded',
  'purchase_not_recorded', 'transfer_issue', 'counting_mistake', 'other',
];

export const REASON_TYPE_LABELS: Record<ReasonType, string> = {
  broken: 'مكسور',
  damaged: 'تالف',
  theft: 'سرقة',
  sale_not_recorded: 'بيع غير مسجل',
  purchase_not_recorded: 'شراء غير مسجل',
  transfer_issue: 'مشكلة تحويل',
  counting_mistake: 'خطأ عد',
  other: 'أخرى',
};

export type DifferenceStatus = 'match' | 'shortage' | 'excess' | 'pending';

export interface CountItem {
  id: number; product_id: number; system_quantity: number;
  physical_quantity: number | null; difference: number | null;
  reason: string | null; reason_type: ReasonType | null;
  counted_by?: number | null; counted_by_user?: { id: number; name: string } | null;
  /** Set whenever physical_quantity was last recorded — "count date" in the UI. */
  updated_at?: string;
  product?: { id: number; name: string; sku: string | null; barcode: string | null; scalar: string | null; image: string | null };
  /** abs(difference) × the product's current purchase_cost — same convention as the session summary values. */
  difference_value?: number;
  /** Populated only after InventoryCountService::adjustInventory() has run (session status 'completed'). */
  stock_before_adjustment?: number | null;
  stock_after_adjustment?: number | null;
  adjustment_quantity?: number | null;
  adjustment_applied?: boolean;
  adjustment_applied_by?: string | null;
  adjustment_date?: string | null;
}

export interface CountSessionSummary {
  total_products: number;
  /** Products that had stock in this shop when the session was created — the full coverage denominator. */
  counted_count: number;
  /** Never had a physical_quantity recorded this session — distinct from "matched" (counted, zero difference). */
  not_counted_count: number;
  matching_count: number;
  shortage_count: number;
  excess_count: number;
  total_shortage_value: number;
  total_excess_value: number;
}

export interface CountSession {
  id: number; shop_id: number; status: CountSessionStatus; notes: string | null;
  created_at: string; reviewed_at?: string | null; approved_at?: string | null; completed_at?: string | null;
  shop?: { id: number; name: string }; created_by_user?: { id: number; name: string };
  approved_by?: number | null; approved_by_user?: { id: number; name: string } | null;
  employees?: { id: number; name: string }[]; items: CountItem[]; items_count?: number;
  summary?: CountSessionSummary;
}

export interface CountSessionPage { data: CountSession[]; current_page: number; last_page: number; total: number; per_page: number; }

export interface CountFilters { status?: string; shop_id?: number; search?: string; page?: number; per_page?: number; }

/** match | shortage | excess | pending — item.difference comes back as a decimal-cast string from Laravel. */
export function differenceStatus(item: { physical_quantity: number | string | null; difference: number | string | null }): DifferenceStatus {
  if (item.physical_quantity === null || item.physical_quantity === undefined) return 'pending';
  const diff = item.difference != null ? Number(item.difference) : 0;
  if (diff === 0) return 'match';
  return diff > 0 ? 'excess' : 'shortage';
}

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

  setItemReason(id: number, itemId: number, reason: string, reasonType?: ReasonType | null): Observable<CountItem> {
    return this.http
      .put<any>(`${API_BASE}/${id}/items/${itemId}/reason`, { reason, reason_type: reasonType || null })
      .pipe(map((r) => r.data));
  }

  approve(id: number): Observable<CountSession> {
    return this.http.post<any>(`${API_BASE}/${id}/approve`, {}).pipe(map((r) => r.data));
  }

  adjustInventory(id: number): Observable<CountSession> {
    return this.http.post<any>(`${API_BASE}/${id}/adjust-inventory`, {}).pipe(map((r) => r.data));
  }
}
