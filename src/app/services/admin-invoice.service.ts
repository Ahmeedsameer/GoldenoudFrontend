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
}
