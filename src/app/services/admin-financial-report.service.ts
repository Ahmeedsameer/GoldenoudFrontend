import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

const BASE = 'http://127.0.0.1:8000/api/admin/reports/financial';

export type ReportPeriod = 'today' | 'week' | 'month' | 'year';

export interface FinancialSummary {
  period:        { from: string; to: string };
  tx_count:      number;
  total_in:      number;
  total_out:     number;
  net_flow:      number;
  sales_revenue: number;
  refunds:       number;
  deposits:      number;
  withdrawals:   number;
  expenses:      number;
}

export interface FinancialTrendPoint {
  date:      string;
  total_in:  number;
  total_out: number;
}

export interface FinancialShopStat {
  safe_id:   number;
  shop_id:   number;
  shop_name: string;
  type_name: string;
  total_in:  number;
  total_out: number;
  net_flow:  number;
  sales:     number;
  deposits:  number;
  expenses:  number;
  refunds:   number;
}

export interface SafeBalanceLine {
  currency:      string;
  currency_code: string;
  symbol:        string;
  balance:       number;
}

export interface SafeBalanceEntry {
  safe_id:   number;
  shop_id:   number;
  shop_name: string;
  type_name: string;
  is_active: boolean;
  balances:  SafeBalanceLine[];
}

export interface FinancialTransaction {
  id:         number;
  safe_id:    number;
  shop_name:  string;
  type:       string;
  direction:  string;
  currency:   string;
  symbol:     string;
  amount:     number;
  reason:     string | null;
  note:       string | null;
  user_name:  string;
  created_at: string;
}

export interface FinancialTransactionPage {
  data:         FinancialTransaction[];
  current_page: number;
  last_page:    number;
  total:        number;
  per_page:     number;
}

@Injectable({ providedIn: 'root' })
export class AdminFinancialReportService {
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
      .pipe(map(r => r.data as FinancialSummary));
  }

  getTrend(period: ReportPeriod, from?: string, to?: string, shopId?: number | null) {
    return this.http
      .get<any>(`${BASE}/trend`, { params: this.params(period, from, to, shopId) })
      .pipe(map(r => r.data as FinancialTrendPoint[]));
  }

  getByShop(period: ReportPeriod, from?: string, to?: string, shopId?: number | null) {
    return this.http
      .get<any>(`${BASE}/by-shop`, { params: this.params(period, from, to, shopId) })
      .pipe(map(r => r.data as FinancialShopStat[]));
  }

  getBalances(shopId?: number | null) {
    const p: Record<string, string | number> = {};
    if (shopId) p['shop_id'] = shopId;
    return this.http
      .get<any>(`${BASE}/balances`, { params: p })
      .pipe(map(r => r.data as SafeBalanceEntry[]));
  }

  getTransactions(
    period: ReportPeriod,
    from?: string,
    to?: string,
    filters: {
      shop_id?:    number | null;
      type?:       string;
      direction?:  string;
      min_amount?: number | null;
      max_amount?: number | null;
      page?:       number;
      per_page?:   number;
    } = {}
  ) {
    const p: Record<string, string | number> = { period };
    if (from)                    p['from']       = from;
    if (to)                      p['to']         = to;
    if (filters.shop_id)         p['shop_id']    = filters.shop_id;
    if (filters.type)            p['type']       = filters.type;
    if (filters.direction)       p['direction']  = filters.direction;
    if (filters.min_amount != null) p['min_amount'] = filters.min_amount;
    if (filters.max_amount != null) p['max_amount'] = filters.max_amount;
    if (filters.page)            p['page']       = filters.page;
    if (filters.per_page)        p['per_page']   = filters.per_page;
    return this.http
      .get<any>(`${BASE}/transactions`, { params: p })
      .pipe(map(r => r.data as FinancialTransactionPage));
  }
}
