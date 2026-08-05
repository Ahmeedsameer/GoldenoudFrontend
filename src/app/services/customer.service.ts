import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API_BASE = `${environment.apiBaseUrl}`;

/**
 * Customer Management module — list/detail/reports. Search, quick-create,
 * and cashier autocomplete stay on SalesService (they already existed there);
 * this service is only the Admin/Manager-facing management surface.
 */
@Injectable({ providedIn: 'root' })
export class CustomerService {
  private http = inject(HttpClient);

  // Backend wraps the paginator in { message, data: <paginator> }; unwrap so
  // ListManager + extractPagination receive the standard Laravel paginated shape.
  getCustomers(params: any): Observable<any> {
    return this.http.get<any>(`${API_BASE}/customers`, { params: dropUndefined(params) }).pipe(map((res) => res?.data ?? res));
  }

  getCustomer(id: number): Observable<any> {
    return this.http.get<any>(`${API_BASE}/customers/${id}`);
  }

  /** New Customers report — customers created within a date range. */
  getNewCustomers(params: { date_from?: string; date_to?: string; per_page?: number; page?: number }): Observable<any> {
    return this.http.get<any>(`${API_BASE}/customers/reports/new`, { params: dropUndefined(params) });
  }

  /** Inactive Customers report — no approved purchase within {days}. */
  getInactiveCustomers(params: { days?: number; per_page?: number; page?: number }): Observable<any> {
    return this.http.get<any>(`${API_BASE}/customers/reports/inactive`, { params: dropUndefined(params) });
  }

  /** Admin/Manager only — backend 403s for Seller. */
  updateNotes(id: number, notes: string | null): Observable<any> {
    return this.http.put<any>(`${API_BASE}/customers/${id}/notes`, { notes });
  }

  /** Edit the customer's own info (name/phone/email/address) — Admin only. */
  updateCustomer(id: number, payload: { name: string; phone: string; email?: string | null; address?: string | null }): Observable<any> {
    return this.http.put<any>(`${API_BASE}/customers/${id}`, payload);
  }

  /** Lazy-loaded — kept out of getCustomer()'s payload so the main profile load stays fast. */
  getSimilarCustomers(id: number): Observable<any> {
    return this.http.get<any>(`${API_BASE}/customers/${id}/similar`);
  }

  // ── Tags ──────────────────────────────────────────────
  getTags(): Observable<any> {
    return this.http.get<any>(`${API_BASE}/tags`);
  }

  /** Admin/Manager only — always creates a 'manual' tag. */
  createTag(payload: { name: string; color: string }): Observable<any> {
    return this.http.post<any>(`${API_BASE}/tags`, payload);
  }

  attachTag(customerId: number, tagId: number): Observable<any> {
    return this.http.post<any>(`${API_BASE}/customers/${customerId}/tags`, { tag_id: tagId });
  }

  detachTag(customerId: number, tagId: number): Observable<any> {
    return this.http.delete<any>(`${API_BASE}/customers/${customerId}/tags/${tagId}`);
  }

  // ── Notes history — replaces the old single-field updateNotes() above for new UI ──
  getNoteHistory(id: number): Observable<any> {
    return this.http.get<any>(`${API_BASE}/customers/${id}/notes`);
  }

  addNote(id: number, note: string): Observable<any> {
    return this.http.post<any>(`${API_BASE}/customers/${id}/notes-history`, { note });
  }

  editNote(id: number, noteId: number, note: string): Observable<any> {
    return this.http.put<any>(`${API_BASE}/customers/${id}/notes-history/${noteId}`, { note });
  }

  /** Admin only. */
  deleteNote(id: number, noteId: number): Observable<any> {
    return this.http.delete<any>(`${API_BASE}/customers/${id}/notes-history/${noteId}`);
  }
}

/** HttpClient serializes `undefined` values as the literal string "undefined"
 *  rather than omitting the param — strip them so an unset optional filter
 *  never reaches the backend as a real (non-empty) value. */
function dropUndefined(params: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null));
}
