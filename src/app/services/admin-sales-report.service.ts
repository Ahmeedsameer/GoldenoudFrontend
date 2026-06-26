import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

const BASE = 'http://127.0.0.1:8000/api/admin/reports/sales';

// ── Response shapes ──────────────────────────────────────────────────────────

export interface AdminSalesSummary {
  period: { from: string; to: string };
  invoice_count:    number;
  total_revenue:    number;
  avg_invoice:      number;
  max_invoice:      number;
  min_invoice:      number;
  total_items_sold: number;
  unique_customers: number;
  walk_in_count:    number;
  pending_count:    number;
  pending_value:    number;
  active_shops:     number;
}

export interface AdminSalesTrend {
  date:          string;
  invoice_count: number;
  revenue:       number;
}

export interface AdminShopStat {
  shop_id:          number;
  shop_name:        string;
  invoice_count:    number;
  total_revenue:    number;
  avg_invoice:      number;
  max_invoice:      number;
  seller_count:     number;
  unique_customers: number;
  share:            number;
}

export interface AdminSellerStat {
  seller_id:        number;
  seller_name:      string;
  shop_id:          number;
  shop_name:        string;
  invoice_count:    number;
  total_revenue:    number;
  avg_invoice:      number;
  max_invoice:      number;
  min_invoice:      number;
  unique_customers: number;
  share:            number;
}

export interface AdminProductStat {
  product_id:    number;
  product_name:  string;
  sku:           string;
  scalar:        string;
  category_name: string;
  total_qty:     number;
  total_revenue: number;
  avg_price:     number;
  max_price:     number;
  min_price:     number;
  invoice_count: number;
  shop_count:    number;
  share:         number;
}

export interface AdminCategoryStat {
  category_id:   number | null;
  category_name: string;
  product_count: number;
  invoice_count: number;
  total_qty:     number;
  total_revenue: number;
  share:         number;
}

export interface AdminTopCustomer {
  customer_id:    number;
  customer_name:  string;
  customer_phone: string;
  visit_count:    number;
  total_spent:    number;
  avg_spent:      number;
  max_invoice:    number;
  min_invoice:    number;
}

export interface AdminCustomerSummary {
  period:               { from: string; to: string };
  total_invoices:       number;
  registered_invoices:  number;
  walk_in_invoices:     number;
  unique_registered:    number;
  registered_revenue:   number;
  walk_in_revenue:      number;
  top_customers:        AdminTopCustomer[];
}

export interface AdminHourlyPoint {
  hour:          number;
  invoice_count: number;
  revenue:       number;
}

export interface AdminInvoiceRow {
  id:             number;
  date:           string;
  shop_id:        number;
  shop_name:      string;
  seller_id:      number;
  seller_name:    string;
  customer_id:    number | null;
  customer_name:  string;
  customer_phone: string;
  items_count:    number;
  total_amount:   number;
  status:         string;
  price_type:     string;
}

export interface AdminInvoicePage {
  data:         AdminInvoiceRow[];
  current_page: number;
  last_page:    number;
  total:        number;
  per_page:     number;
}

// ── Service ──────────────────────────────────────────────────────────────────

export type ReportPeriod = 'today' | 'week' | 'month' | 'year';

@Injectable({ providedIn: 'root' })
export class AdminSalesReportService {
  private http = inject(HttpClient);

  private params(
    period: ReportPeriod,
    from?: string,
    to?: string,
    shopId?: number | null,
    extra: Record<string, string | number> = {}
  ): Record<string, string | number> {
    const p: Record<string, string | number> = { period };
    if (from)   p['from']    = from;
    if (to)     p['to']      = to;
    if (shopId) p['shop_id'] = shopId;
    return { ...p, ...extra };
  }

  getSummary(period: ReportPeriod, from?: string, to?: string, shopId?: number | null) {
    return this.http
      .get<any>(`${BASE}/summary`, { params: this.params(period, from, to, shopId) })
      .pipe(map(r => r.data as AdminSalesSummary));
  }

  getTrend(period: ReportPeriod, from?: string, to?: string, shopId?: number | null) {
    return this.http
      .get<any>(`${BASE}/trend`, { params: this.params(period, from, to, shopId) })
      .pipe(map(r => r.data as AdminSalesTrend[]));
  }

  getByShop(period: ReportPeriod, from?: string, to?: string) {
    return this.http
      .get<any>(`${BASE}/by-shop`, { params: this.params(period, from, to) })
      .pipe(map(r => r.data as AdminShopStat[]));
  }

  getBySeller(period: ReportPeriod, from?: string, to?: string, shopId?: number | null) {
    return this.http
      .get<any>(`${BASE}/by-seller`, { params: this.params(period, from, to, shopId) })
      .pipe(map(r => r.data as AdminSellerStat[]));
  }

  getByProduct(period: ReportPeriod, from?: string, to?: string, shopId?: number | null) {
    return this.http
      .get<any>(`${BASE}/by-product`, { params: this.params(period, from, to, shopId) })
      .pipe(map(r => r.data as AdminProductStat[]));
  }

  getByCategory(period: ReportPeriod, from?: string, to?: string, shopId?: number | null) {
    return this.http
      .get<any>(`${BASE}/by-category`, { params: this.params(period, from, to, shopId) })
      .pipe(map(r => r.data as AdminCategoryStat[]));
  }

  getCustomers(period: ReportPeriod, from?: string, to?: string, shopId?: number | null) {
    return this.http
      .get<any>(`${BASE}/customers`, { params: this.params(period, from, to, shopId) })
      .pipe(map(r => r.data as AdminCustomerSummary));
  }

  getHourly(period: ReportPeriod, from?: string, to?: string, shopId?: number | null) {
    return this.http
      .get<any>(`${BASE}/hourly`, { params: this.params(period, from, to, shopId) })
      .pipe(map(r => r.data as AdminHourlyPoint[]));
  }

  getInvoices(
    period: ReportPeriod,
    from?: string,
    to?: string,
    filters: {
      shop_id?: number | null;
      seller_id?: number | null;
      status?: string;
      min_amount?: number | null;
      max_amount?: number | null;
      customer?: string;
      page?: number;
      per_page?: number;
    } = {}
  ) {
    const p: Record<string, string | number> = { period };
    if (from)                  p['from']       = from;
    if (to)                    p['to']         = to;
    if (filters.shop_id)       p['shop_id']    = filters.shop_id;
    if (filters.seller_id)     p['seller_id']  = filters.seller_id;
    if (filters.status)        p['status']     = filters.status;
    if (filters.min_amount != null) p['min_amount'] = filters.min_amount;
    if (filters.max_amount != null) p['max_amount'] = filters.max_amount;
    if (filters.customer)      p['customer']   = filters.customer;
    if (filters.page)          p['page']       = filters.page;
    if (filters.per_page)      p['per_page']   = filters.per_page;

    return this.http
      .get<any>(`${BASE}/invoices`, { params: p })
      .pipe(map(r => r.data as AdminInvoicePage));
  }
}
