import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';

const API_BASE = `${environment.apiBaseUrl}`;

export type BatchPricingStatus =
  | 'waiting_for_first_supply'
  | 'needs_initial_pricing'
  | 'priced'
  | 'pricing_update_required'
  | 'inactive';

export interface PricingRow {
  id: number;
  name: string;
  sku: string | null;
  product_type: 'COMPOUND' | 'READY_PRODUCT' | 'RAW_MATERIAL' | 'PACKAGING';
  /** Which product column this row's price actually lives in — oils (and any
   *  other category-priced raw material) are priced per gram/ml; Compound
   *  uses its own default; everything else priced per purchase batch
   *  (Ready Products, Packaging/bottles, and any future batch-priced
   *  inventory item — Product::isBatchPriced()) is 'batch'. */
  pricing_field: 'selling_price' | 'price_per_gram' | 'default_selling_price' | 'batch';
  unit: string | null;
  current_cost: number | null;
  selling_price: number | null;
  estimated_profit: number | null;
  profit_percent: number | null;
  last_price_update: string | null;
  status: 'ok' | 'needs_review' | 'no_price' | BatchPricingStatus;

  // ── Batch-priced products only (pricing_field === 'batch') ──────────────
  current_inventory?: number;
  current_fifo_price?: number | null;
  next_batch_price?: number | null;
  remaining_in_current_batch?: number | null;
  batches_total?: number;
  batches_priced?: number;
  batches_unpriced?: number;
  needs_pricing?: boolean;
  latest_supply_date?: string | null;
  latest_pricing_date?: string | null;
}

export interface PricingBatch {
  id: number;
  supply_date: string | null;
  purchase_cost: number;
  selling_price: number | null;
  quantity_received: number;
  remaining_quantity: number;
  is_priced: boolean;
  is_archived: boolean;
  priced_at: string | null;
  priced_by: string | null;
  status: 'waiting_for_pricing' | 'active' | 'queued' | 'depleted' | 'archived';
}

export interface PricingDetail extends PricingRow {
  latest_purchase_price?: number | null;
  average_purchase_price?: number | null;
  batches?: PricingBatch[];
  /** Batch-priced products only — category pricing helpers (see PricingService::listBatches). */
  category_minimum_price?: number | null;
  category_default_price?: number | null;
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
  type: 'cost_update' | 'price_edit' | 'batch_pricing' | 'batch_price_edit';
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

  /** Every batch for this product + current_fifo_price/next_batch_price/remaining_in_current_batch. */
  batches(id: number): Observable<{ batches: PricingBatch[] } & Record<string, any>> {
    return this.http.get<any>(`${API_BASE}/pricing/${id}/batches`).pipe(map((res) => res.data));
  }

  /** Prices exactly ONE unpriced batch — immutable once set, 422 if already priced. */
  priceBatch(id: number, supplyItemId: number, sellingPrice: number, reason?: string): Observable<PricingDetail> {
    return this.http
      .put<any>(`${API_BASE}/pricing/${id}/batches/${supplyItemId}/price`, { selling_price: sellingPrice, reason: reason || null })
      .pipe(map((res) => res.data));
  }

  /** Edits an ALREADY-priced batch's selling price — future sales only, past invoices unaffected. */
  updateBatchPrice(id: number, supplyItemId: number, sellingPrice: number, reason?: string): Observable<PricingDetail> {
    return this.http
      .patch<any>(`${API_BASE}/pricing/${id}/batches/${supplyItemId}/price`, { selling_price: sellingPrice, reason: reason || null })
      .pipe(map((res) => res.data));
  }

  /** Retires a batch from future sale — never a physical delete; it stays fully visible in history. */
  archiveBatch(id: number, supplyItemId: number): Observable<PricingDetail> {
    return this.http
      .post<any>(`${API_BASE}/pricing/${id}/batches/${supplyItemId}/archive`, {})
      .pipe(map((res) => res.data));
  }
}
