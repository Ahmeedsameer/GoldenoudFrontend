import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api';

export interface PricingRow {
  id: number;
  name: string;
  sku: string | null;
  product_type: 'COMPOUND' | 'READY_PRODUCT';
  current_cost: number | null;
  selling_price: number | null;
  estimated_profit: number | null;
  profit_percent: number | null;
  last_price_update: string | null;
  status: 'ok' | 'needs_review' | 'no_price';
}

export interface PricingDetail extends PricingRow {
  latest_purchase_price: number | null;
  average_purchase_price: number | null;
}

export interface PriceUpdateChange {
  id: number;
  name: string;
  sku: string | null;
  old_cost: number | null;
  new_cost: number;
  selling_price: number | null;
  profit_before: number | null;
  profit_after: number | null;
}

export interface PriceHistoryRow {
  id: number;
  old_cost: number | null;
  new_cost: number | null;
  old_selling_price: number | null;
  new_selling_price: number | null;
  type: 'cost_update' | 'price_edit';
  reason: string | null;
  updated_by: { id: number; name: string } | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class PricingService {
  private http = inject(HttpClient);

  list(search?: string): Observable<PricingRow[]> {
    return this.http
      .get<any>(`${API_BASE}/pricing`, { params: search ? { search } : {} })
      .pipe(map((res) => res.data || []));
  }

  detail(id: number): Observable<PricingDetail> {
    return this.http.get<any>(`${API_BASE}/pricing/${id}`).pipe(map((res) => res.data));
  }

  history(id: number, page = 1): Observable<{ data: PriceHistoryRow[]; meta: { current_page: number; last_page: number; total: number } }> {
    return this.http
      .get<any>(`${API_BASE}/pricing/${id}/history`, { params: { page } })
      .pipe(map((res) => ({ data: res.data || [], meta: res.meta })));
  }

  previewUpdate(): Observable<PriceUpdateChange[]> {
    return this.http.get<any>(`${API_BASE}/pricing/update/preview`).pipe(map((res) => res.data || []));
  }

  applyUpdate(productIds?: number[]): Observable<{ message: string; data: PriceUpdateChange[] }> {
    return this.http.post<any>(`${API_BASE}/pricing/update/apply`, { product_ids: productIds ?? null });
  }

  updateSellingPrice(id: number, sellingPrice: number, reason?: string): Observable<PricingDetail> {
    return this.http
      .put<any>(`${API_BASE}/pricing/${id}/selling-price`, { selling_price: sellingPrice, reason: reason || null })
      .pipe(map((res) => res.data));
  }
}
