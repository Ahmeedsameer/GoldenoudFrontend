import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, retry } from 'rxjs';
import { CreateInvoiceRequest, Customer, GoodsSearchResult, Invoice, TesterUser } from '../models/sales.model';

const API_BASE = 'http://127.0.0.1:8000/api';

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private http = inject(HttpClient);

  // ── Goods search (for cashier item rows) ──────────────────
  searchGoods(search: string, perPage = 20): Observable<GoodsSearchResult[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/goods`, { params: { search, per_page: perPage } })
      .pipe(map((res) => res.data?.data || res.data || []));
  }

  // ── Customer search (for cashier customer section) ─────────
  searchCustomers(phone: string, perPage = 10): Observable<Customer[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/customers`, { params: { phone, per_page: perPage } })
      .pipe(map((res) => res.data?.data || res.data || []));
  }

  // ── Tester (user) search ──────────────────────────────────
  searchTesters(query: string, perPage = 10): Observable<TesterUser[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/testers`, { params: { search: query, per_page: perPage } })
      .pipe(map((res) => res.data?.data || res.data || []));
  }

  // ── Invoices list ──────────────────────────────────────────
  // The API returns { message, data: { data: [...], current_page, last_page } }
  // We unwrap the outer envelope so ListManager + extractPagination work correctly
  getInvoices(params: any): Observable<any> {
    return this.http
      .get<any>(`${API_BASE}/sales/invoices`, { params })
      .pipe(retry(2), map((res) => res.data));
  }

  // ── Single invoice ─────────────────────────────────────────
  getInvoice(id: number): Observable<any> {
    return this.http
      .get<any>(`${API_BASE}/sales/invoices/${id}`)
      .pipe(retry(2));
  }

  // ── Create invoice ─────────────────────────────────────────
  createInvoice(payload: CreateInvoiceRequest): Observable<any> {
    return this.http.post<any>(`${API_BASE}/sales/invoices`, payload);
  }

  // ── Update invoice status ──────────────────────────────────
  updateInvoiceStatus(id: number, status: string): Observable<any> {
    return this.http.put<any>(`${API_BASE}/sales/invoices/${id}/status`, { status });
  }
}
