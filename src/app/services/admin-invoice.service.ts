import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

const API_BASE = `${environment.apiBaseUrl}/admin/invoices`;

@Injectable({ providedIn: 'root' })
export class AdminInvoiceService {
  private http = inject(HttpClient);

  /** List invoices for admin review (defaults to the pending queue). */
  getInvoices(params: Record<string, any>): Observable<any> {
    return this.http.get<any>(API_BASE, { params });
  }

  /** Approve (approved) or reject (cancelled) an invoice. */
  updateStatus(id: number, status: 'approved' | 'cancelled'): Observable<any> {
    return this.http.put<any>(`${API_BASE}/${id}/status`, { status });
  }

  /** Cancel an already-approved (completed) sale — reverses stock AND money, unlike updateStatus('cancelled') above. */
  cancel(id: number, reason?: string): Observable<any> {
    return this.http.post<any>(`${API_BASE}/${id}/cancel`, { reason });
  }

  /** Restores stock to the original batches then rebuilds via FIFO; the financial
   *  difference (if any) posts as a single safe adjustment transaction. */
  edit(id: number, payload: {
    items: { product_id: number; quantity: number; price?: number | null; parent_product_id?: number | null; role?: string | null }[];
    pricing_mode?: 'auto' | 'global';
    safe_id?: number | null;
    note?: string | null;
  }): Observable<any> {
    return this.http.put<any>(`${API_BASE}/${id}/edit`, payload);
  }

  /** Read-only — runs the exact same rebuild engine as edit() then rolls back
   *  server-side, so old/new totals and per-line prices can be shown live
   *  before committing anything. */
  previewEdit(id: number, payload: {
    items: { product_id: number; quantity: number; price?: number | null; parent_product_id?: number | null; role?: string | null }[];
    pricing_mode?: 'auto' | 'global';
  }): Observable<any> {
    return this.http.put<any>(`${API_BASE}/${id}/edit/preview`, payload);
  }
}
