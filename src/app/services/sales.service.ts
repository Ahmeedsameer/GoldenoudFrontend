import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, retry } from 'rxjs';
import { CreateInvoiceRequest, Customer, GoodsSearchResult, Invoice, PaymentMethod, SalesCategory } from '../models/sales.model';
import { AuthService } from './auth.service';

import { environment } from '../../environments/environment';

const API_BASE = `${environment.apiBaseUrl}`;

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // ── Goods search (for cashier item rows) ───
  searchGoods(search: string, perPage = 20, categoryId?: number): Observable<GoodsSearchResult[]> {
    const params: Record<string, any> = { search, per_page: perPage };
    if (categoryId) params['category_id'] = categoryId;
    return this.http
      .get<any>(`${API_BASE}/sales/goods`, { params })
      .pipe(map((res) => res.data?.data || res.data || []));
  }

  /**
   * Barcode-scanner lookup — EXACT match only (barcode, then SKU), never
   * product name. Distinct from searchGoods()'s fuzzy multi-field search.
   */
  findGoodsByBarcode(code: string): Observable<{ status: 'found' | 'not_found' | 'ambiguous'; data: GoodsSearchResult | null }> {
    return this.http
      .get<any>(`${API_BASE}/sales/goods/barcode`, { params: { code } })
      .pipe(map((res) => ({ status: res.status, data: res.data })));
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

  // ── Product Builder: raw materials in the dedicated "كحول" category —
  // chosen exactly like an oil, freely, every sale. ───────────────────────────
  searchAlcoholProducts(search: string): Observable<any[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/alcohol-products`, { params: { search } })
      .pipe(map((res) => res.data || []));
  }

  // ── Product Builder: live price calculation + bottle-capacity validation ───
  calculateCompoundPrice(params: {
    catalog_product_id: number; oil_product_id: number; oil_qty: number; bottle_product_id: number;
    alcohol_product_id?: number; alcohol_qty?: number;
    /** Manufacturing Quantity — how many identical bottles this operation produces. Defaults to 1 server-side. */
    quantity?: number;
  }): Observable<{
    oil_unit_price: number; oil_cost: number; oil_stock: number;
    bottle_unit_price: number; bottle_cost: number; bottle_stock: number; bottle_capacity_ml: number | null;
    // Alcohol is a real, fully-costed Raw Material (never zero) — its true unit
    // price/cost is returned for its own invoice line, but total_cost (the
    // Composite Product's commercial cost/profit basis) never includes it.
    alcohol_unit_price: number | null; alcohol_cost: number | null; alcohol_stock: number | null;
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

  // ── Customer search (for cashier customer section) — name OR phone ────
  searchCustomers(search: string, perPage = 10): Observable<Customer[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/customers`, { params: { search, per_page: perPage } })
      .pipe(map((res) => res.data?.data || res.data || []));
  }

  /** Quick-create a customer from inside the cashier without submitting an invoice. */
  createCustomer(payload: { name: string; phone: string; email?: string | null; address?: string | null }): Observable<Customer> {
    return this.http
      .post<any>(`${API_BASE}/sales/customers`, payload)
      .pipe(map((res) => res.data));
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
  // Role-scoped: `/sales/invoices/{id}` (InvoiceController) is seller-owned-only
  // (`where('seller_id', auth()->id())`), so a manager opening another
  // seller's invoice from the shared invoice-detail page 404s there — must
  // go through `/manager/invoices/{id}` (shop-scoped) instead. Admin has no
  // seat in the `sales,manager`-only role check at all — reuse the existing
  // admin-only invoice-review endpoint. Same Invoice shape from all three.
  private invoiceDetailBase(id: number): string {
    if (this.authService.isAdmin()) return `${API_BASE}/admin/invoices/${id}`;
    if (this.authService.isManager()) return `${API_BASE}/manager/invoices/${id}`;
    return `${API_BASE}/sales/invoices/${id}`;
  }

  getInvoice(id: number): Observable<any> {
    return this.http.get<any>(this.invoiceDetailBase(id)).pipe(retry(2));
  }

  // ── Create invoice ─────────────────────────────────────────
  createInvoice(payload: CreateInvoiceRequest): Observable<any> {
    return this.http.post<any>(`${API_BASE}/sales/invoices`, payload);
  }

  // ── Update invoice status ──────────────────────────────────
  updateInvoiceStatus(id: number, status: string): Observable<any> {
    const base = this.authService.isAdmin() ? `${API_BASE}/admin/invoices/${id}/status` : `${API_BASE}/sales/invoices/${id}/status`;
    return this.http.put<any>(base, { status });
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

  // ── Seller-accessible payment methods (admin-managed, unlimited) ──
  getSellerPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http
      .get<any>(`${API_BASE}/sales/payment-methods`)
      .pipe(map((res) => res.data || []));
  }

  /** Live pre-sale cost preview for the cashier's cart — reuses the exact same
   *  FIFO batch order the sale itself will drain from (SalesService::quoteCartCost()). */
  quoteCartCost(items: { product_id: number; quantity: number }[]): Observable<{ total_cost: number; lines: { product_id: number; quantity: number; cost: number }[] }> {
    return this.http
      .post<any>(`${API_BASE}/sales/quote-cost`, { items })
      .pipe(map((res) => res.data));
  }
}
