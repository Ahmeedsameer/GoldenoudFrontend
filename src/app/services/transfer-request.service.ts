import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/transfers';

export type TransferStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'preparing' | 'shipped' | 'received' | 'closed';
export type TransferPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TransferRequestItem {
  id: number; product_id: number;
  product?: { id: number; name: string; sku: string | null; scalar: string | null };
  unit: string | null; available_stock_at_request: number; requested_quantity: number; approved_quantity: number | null;
  received_quantity: number | null; missing_quantity: number | null; damaged_quantity: number | null; receiving_notes: string | null;
}

export interface TransferRequestLog {
  id: number; user: { id: number; name: string } | null; action: string;
  previous_status: string | null; new_status: string | null; notes: string | null; created_at: string;
}

export interface InternalTransferInvoice {
  id: number; invoice_number: string; reference_value: number; status: string; date: string;
}

export interface TransferRequest {
  id: number; request_number: string; status: TransferStatus; priority: TransferPriority;
  source_shop_id: number; destination_shop_id: number;
  source_shop?: { id: number; name: string }; destination_shop?: { id: number; name: string };
  requested_by_user?: { id: number; name: string }; approved_by_user?: { id: number; name: string } | null;
  requested_date: string; notes: string | null; is_emergency?: boolean;
  cancelled_at?: string | null; cancelled_by?: number | null;
  items: TransferRequestItem[]; logs?: TransferRequestLog[]; internal_invoice?: InternalTransferInvoice | null;
  created_at: string;
}

export interface TransferRequestPage {
  data: TransferRequest[]; current_page: number; last_page: number; total: number; per_page: number;
}

export interface TransferRequestFilters { status?: string; shop_id?: number; page?: number; per_page?: number; }

@Injectable({ providedIn: 'root' })
export class TransferRequestService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  list(filters: TransferRequestFilters): Observable<TransferRequestPage> {
    return this.http.get<any>(API_BASE, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }

  get(id: number): Observable<TransferRequest> {
    return this.http.get<any>(`${API_BASE}/${id}`).pipe(map((r) => r.data));
  }

  availableStock(productId: number, shopId: number): Observable<number> {
    return this.http.get<any>(`${API_BASE}/available-stock`, { params: { product_id: productId, shop_id: shopId } }).pipe(map((r) => r.data.available));
  }

  create(payload: {
    source_shop_id: number; destination_shop_id: number; requested_date?: string; priority?: TransferPriority;
    notes?: string; submit?: boolean; items: { product_id: number; requested_quantity: number }[];
  }): Observable<TransferRequest> {
    return this.http.post<any>(API_BASE, payload).pipe(map((r) => r.data));
  }

  submit(id: number): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/submit`, {}).pipe(map((r) => r.data)); }
  approve(id: number, notes?: string): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/approve`, { notes }).pipe(map((r) => r.data)); }
  reject(id: number, reason: string): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/reject`, { reason }).pipe(map((r) => r.data)); }
  prepare(id: number): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/prepare`, {}).pipe(map((r) => r.data)); }
  ship(id: number): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/ship`, {}).pipe(map((r) => r.data)); }
  close(id: number): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/close`, {}).pipe(map((r) => r.data)); }
  cancel(id: number, reason: string): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/cancel`, { reason }).pipe(map((r) => r.data)); }

  receive(id: number, payload: {
    notes?: string;
    items: { item_id: number; received_quantity: number; missing_quantity?: number; damaged_quantity?: number; notes?: string }[];
  }): Observable<TransferRequest> {
    return this.http.post<any>(`${API_BASE}/${id}/receive`, payload).pipe(map((r) => r.data));
  }
}
