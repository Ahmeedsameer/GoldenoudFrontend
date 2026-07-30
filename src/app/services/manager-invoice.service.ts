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
}
