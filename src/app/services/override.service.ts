import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api';

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

  /** List all override requests for the manager's shop. */
  getPendingRequests(): Observable<OverrideRequestSummary[]> {
    return this.http
      .get<any>(`${API_BASE}/manager/override-requests`)
      .pipe(map((res) => (res.data ?? []) as OverrideRequestSummary[]));
  }

  /** Approve or reject a request. */
  respond(id: string, action: 'approved' | 'rejected', note = ''): Observable<{ message: string }> {
    return this.http
      .put<any>(`${API_BASE}/manager/override-requests/${id}`, { action, note })
      .pipe(map((res) => res as { message: string }));
  }
}
