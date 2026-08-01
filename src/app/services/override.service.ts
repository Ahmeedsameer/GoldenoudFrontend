import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../environments/environment';

const API_BASE = `${environment.apiBaseUrl}`;

export interface OverrideViolation {
  product_name: string;
  estimated_price: number;
  minimum_price: number;
  category_name: string;
}

export interface OverrideRequestSummary {
  id: string;
  seller_name: string;
  justification: string;
  violations: OverrideViolation[];
  status: 'pending' | 'approved' | 'rejected';
  manager_note: string | null;
  created_at: string;
}

export interface OverrideStatusResult {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  manager_note: string | null;
  /** One-time token — only present when status is 'approved'. */
  token: string | null;
}

@Injectable({ providedIn: 'root' })
export class OverrideService {
  private http = inject(HttpClient);

  // ── Seller endpoints ──────────────────────────────────────────────────────

  /** Submit a new override request. Returns the UUID of the created request. */
  submitRequest(violations: OverrideViolation[], justification: string): Observable<{ id: string }> {
    return this.http
      .post<any>(`${API_BASE}/sales/override-requests`, { violations, justification })
      .pipe(map((res) => res.data as { id: string }));
  }

  /** Poll the status of a submitted request. */
  pollStatus(id: string): Observable<OverrideStatusResult> {
    return this.http
      .get<any>(`${API_BASE}/sales/override-requests/${id}`)
      .pipe(map((res) => res.data as OverrideStatusResult));
  }

  // ── Manager endpoints ─────────────────────────────────────────────────────
  // Backed by the same pending-invoices mechanism the Admin uses under
  // /admin/invoices — scoped server-side to the manager's own shop.

  /** List pending invoices (sold below category minimum) for the manager's own shop. */
  getPendingRequests(): Observable<any[]> {
    return this.http
      .get<any>(`${API_BASE}/manager/override-requests`, { params: { per_page: 50 } })
      .pipe(map((res) => {
        const data = res?.data;
        return Array.isArray(data) ? data : (data?.data ?? []);
      }));
  }

  /** Approve (approved) or reject (cancelled) a pending invoice. */
  respond(id: number, status: 'approved' | 'cancelled'): Observable<{ message: string }> {
    return this.http
      .put<any>(`${API_BASE}/manager/override-requests/${id}`, { status })
      .pipe(map((res) => res as { message: string }));
  }
}
