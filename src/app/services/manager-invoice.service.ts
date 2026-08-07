import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

const API_BASE = `${environment.apiBaseUrl}/manager/invoices`;

/** Branch-wide invoice visibility + cancel for a manager — every sale made in
 *  their shop, not just their own (see ManagerInvoiceController). */
@Injectable({ providedIn: 'root' })
export class ManagerInvoiceService {
  private http = inject(HttpClient);

  getInvoices(params: Record<string, any>): Observable<any> {
    return this.http.get<any>(API_BASE, { params });
  }

  getInvoice(id: number): Observable<any> {
    return this.http.get<any>(`${API_BASE}/${id}`);
  }

  /** Cancel a completed sale — reverses stock AND money. */
  cancel(id: number, reason?: string): Observable<any> {
    return this.http.post<any>(`${API_BASE}/${id}/cancel`, { reason });
  }

  /** Restores stock to the original batches then rebuilds via FIFO; the financial
   *  difference (if any) posts as a single safe adjustment transaction (own branch only). */
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
