import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/manager';

export interface PaymentMethodStat {
  method: string;
  label: string;
  amount_egp: number;
  payment_count: number;
}

export interface SalesSummary {
  period: { from: string; to: string };
  invoice_count: number;
  total_revenue: number;
  avg_invoice: number;
  pending_count: number;
  payment_methods?: PaymentMethodStat[];
}

export interface SellerStat {
  seller_id: number;
  seller_name: string;
  invoice_count: number;
  total_revenue: number;
  avg_invoice: number;
}

export interface ProductStat {
  product_id: number;
  product_name: string;
  scalar: string;
  total_qty: number;
  total_revenue: number;
}

export interface InventoryGood {
  goods_id: number;
  product_id: number | null;
  product_name: string;
  sku: string;
  scalar: string;
  category_name: string;
  current_quantity: number;
  date: string;
}

export interface TopCustomer {
  customer_id: number | null;
  customer_name: string;
  customer_phone: string;
  visit_count: number;
  total_spent: number;
}

export interface CustomerSummary {
  period: { from: string; to: string };
  unique_customers: number;
  total_invoices: number;
  registered_total: number;
  top_customers: TopCustomer[];
}

export interface FinancialTransaction {
  direction: 'in' | 'out';
  type: string;
  currency_code: string;
  currency_symbol: string;
  currency_rate: number;
  total_amount: number;
}

export interface SafeBalanceEntry {
  currency_id: number;
  currency_code: string;
  currency_symbol: string;
  currency_rate: number;
  balance: number;
}

export interface FinancialSafeEntry {
  safe_id: number;
  safe_name: string;
  safe_kind: 'physical' | 'virtual';
  balances: SafeBalanceEntry[];
}

export interface FinancialSummary {
  period: { from: string; to: string };
  income_egp: number;
  expense_egp: number;
  net_egp: number;
  transactions: FinancialTransaction[];
  safes: FinancialSafeEntry[];
}

export interface SalesTrendPoint {
  date: string;
  revenue: number;
  invoice_count: number;
}

export interface InventoryMovement {
  product_id:    number;
  product_name:  string;
  sku:           string;
  scalar:        string;
  category_name: string;
  qty_in:        number;
  qty_sold:      number;
  current_qty:   number;
}

export type ReportPeriod = 'today' | 'week' | 'month' | 'year';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);

  private params(period: ReportPeriod, from?: string, to?: string): Record<string, string> {
    const p: Record<string, string> = { period };
    if (from) p['from'] = from;
    if (to)   p['to']   = to;
    return p;
  }

  getSalesSummary(period: ReportPeriod, from?: string, to?: string) {
    return this.http
      .get<any>(`${API_BASE}/reports/sales`, { params: this.params(period, from, to) })
      .pipe(map((res) => res.data as SalesSummary));
  }

  getSalesTrend(period: ReportPeriod, from?: string, to?: string) {
    return this.http
      .get<any>(`${API_BASE}/reports/sales/trend`, { params: this.params(period, from, to) })
      .pipe(map((res) => res.data as SalesTrendPoint[]));
  }

  getSellerPerformance(period: ReportPeriod, from?: string, to?: string) {
    return this.http
      .get<any>(`${API_BASE}/reports/sellers`, { params: this.params(period, from, to) })
      .pipe(map((res) => res.data as SellerStat[]));
  }

  getTopProducts(period: ReportPeriod, from?: string, to?: string) {
    return this.http
      .get<any>(`${API_BASE}/reports/products`, { params: this.params(period, from, to) })
      .pipe(map((res) => res.data as ProductStat[]));
  }

  getInventoryStatus() {
    return this.http
      .get<any>(`${API_BASE}/reports/inventory`)
      .pipe(map((res) => res.data as InventoryGood[]));
  }

  getInventoryMovements(period: ReportPeriod, from?: string, to?: string) {
    return this.http
      .get<any>(`${API_BASE}/reports/inventory/movements`, { params: this.params(period, from, to) })
      .pipe(map((res) => res.data as InventoryMovement[]));
  }

  getTopCustomers(period: ReportPeriod, from?: string, to?: string) {
    return this.http
      .get<any>(`${API_BASE}/reports/customers`, { params: this.params(period, from, to) })
      .pipe(map((res) => res.data as CustomerSummary));
  }

  getFinancialSummary(period: ReportPeriod, from?: string, to?: string) {
    return this.http
      .get<any>(`${API_BASE}/reports/financial`, { params: this.params(period, from, to) })
      .pipe(map((res) => res.data as FinancialSummary));
  }
}
