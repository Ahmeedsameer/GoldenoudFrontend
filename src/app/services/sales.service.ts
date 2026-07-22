import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, retry } from 'rxjs';
import { CreateInvoiceRequest, Customer, GoodsSearchResult, Invoice, SalesCategory } from '../models/sales.model';

const API_BASE = 'http://127.0.0.1:8000/api';

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private http = inject(HttpClient);

  // ── Goods search (for cashier item rows) ───
  searchGoods(search: string, perPage = 20, categoryId?: number): Observable<GoodsSearchResult[]> {
    const params: Record<string, any> = { search, per_page: perPage };
    if (categoryId) params['category_id'] = categoryId;
    return this.http
      .get<any>(`${API_BASE}/sales/goods`, { params })
      .pipe(map((res) => res.data?.data || res.data || []));
  }

  // ── Catalog (finished/sellable) products — show_in_catalog=true ────────────
  searchCatalogProducts(search: string): Observable<any[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/catalog-products`, { params: { search } })
      .pipe(map((res) => res.data || []));
  }

  // ── Product Builder: raw materials priced as "oil" (per gram) ──────────────
  searchOilProducts(search: string): Observable<any[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/oil-products`, { params: { search } })
      .pipe(map((res) => res.data || []));
  }

  // ── Product Builder: packaging bottles (capacity_ml required) ──────────────
  searchBottleProducts(search: string): Observable<any[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/bottle-products`, { params: { search } })
      .pipe(map((res) => res.data || []));
  }

  // ── Product Builder: live price calculation + bottle-capacity validation ───
  calculateCompoundPrice(params: {
    catalog_product_id: number; oil_product_id: number; oil_qty: number; bottle_product_id: number;
  }): Observable<{
    oil_unit_price: number; oil_cost: number; oil_stock: number;
    bottle_unit_price: number; bottle_cost: number; bottle_stock: number; bottle_capacity_ml: number | null;
    total_cost: number; stock_ok: boolean; default_selling_price: number | null;
  }> {
    return this.http
      .get<any>(`${API_BASE}/sales/compound-price`, { params: params as any })
      .pipe(map((res) => res.data));
  }

  // ── Catalog products matching the search that are NOT stocked in this shop ─
  // (drives the "product exists but not in this branch's stock" hint) ─────────
  searchUnstockedProducts(search: string): Observable<{ id: number; name: string; sku: string; scalar: string }[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/unstocked-products`, { params: { search } })
      .pipe(map((res) => res.data || []));
  }

  // ── Product categories (for lookup panel tabs) ─────────────
  getSalesCategories(): Observable<SalesCategory[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/categories`)
      .pipe(map((res) => res.data || []));
  }

  // ── Customer search (for cashier customer section) ─────────
  searchCustomers(phone: string, perPage = 10): Observable<Customer[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/customers`, { params: { phone, per_page: perPage } })
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

  // ── Seller-accessible currencies ───────────────────────────
  getSellerCurrencies(): Observable<{ id: number; code: string; name: string; symbol: string; rate: number }[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/currencies`)
      .pipe(map((res) => res.data || []));
  }

  // ── Seller-accessible safes for their shop ─────────────────
  getSellerShopSafes(): Observable<any[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/safes`)
      .pipe(map((res) => res.data || []));
  }
}
