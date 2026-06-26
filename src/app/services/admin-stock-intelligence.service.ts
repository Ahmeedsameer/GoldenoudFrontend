import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';

const BASE = 'http://127.0.0.1:8000/api/admin/stock-intelligence';

// ── Overview ──────────────────────────────────────────────────────────────────

export interface StockLocationSummary {
  shop_id:          number | null;
  location_name:    string;
  sku_count:        number;
  stock_value:      number;
  low_stock_count:  number;
  out_stock_count:  number;
}

export interface StockOverview {
  threshold:            number;
  products_with_stock:  number;
  total_stock_value:    number;
  low_stock_count:      number;
  out_of_stock_count:   number;
  active_locations:     number;
  warehouse_value:      number;
  by_location:          StockLocationSummary[];
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export interface InventoryRow {
  product_id:     number;
  product_name:   string;
  sku:            string;
  scalar:         string;
  category_name:  string;
  shop_id:        number | null;
  location_name:  string;
  batch_count:    number;
  total_qty:      number;
  avg_unit_price: number;
  stock_value:    number;
}

export interface InventoryPage {
  data:         InventoryRow[];
  current_page: number;
  last_page:    number;
  total:        number;
  per_page:     number;
}

// ── Low Stock ─────────────────────────────────────────────────────────────────

export interface LowStockRow {
  product_id:     number;
  product_name:   string;
  sku:            string;
  scalar:         string;
  category_name:  string;
  shop_id:        number | null;
  location_name:  string;
  total_qty:      number;
  avg_unit_price: number;
}

// ── Supplies ──────────────────────────────────────────────────────────────────

export interface SupplyRow {
  id:             number;
  date:           string;
  supplier_id:    number;
  supplier_name:  string;
  payment_method: string;
  product_count:  number;
  total_qty:      number;
  total_value:    number;
}

export interface SupplyPage {
  data:         SupplyRow[];
  current_page: number;
  last_page:    number;
  total:        number;
  per_page:     number;
}

@Injectable({ providedIn: 'root' })
export class AdminStockIntelligenceService {
  private http = inject(HttpClient);

  getOverview(threshold: number, shopId?: number | null) {
    const p: Record<string, string | number> = { threshold };
    if (shopId != null) p['shop_id'] = shopId;
    return this.http
      .get<any>(`${BASE}/overview`, { params: p })
      .pipe(map(r => r.data as StockOverview));
  }

  getInventory(filters: {
    shop_id?:     number | null;
    search?:      string;
    category_id?: number | null;
    page?:        number;
    per_page?:    number;
  } = {}) {
    const p: Record<string, string | number> = {};
    if (filters.shop_id != null)    p['shop_id']     = filters.shop_id;
    if (filters.search)             p['search']      = filters.search;
    if (filters.category_id != null) p['category_id'] = filters.category_id;
    if (filters.page)               p['page']        = filters.page;
    if (filters.per_page)           p['per_page']    = filters.per_page;
    return this.http
      .get<any>(`${BASE}/inventory`, { params: p })
      .pipe(map(r => r.data as InventoryPage));
  }

  getLowStock(threshold: number, shopId?: number | null) {
    const p: Record<string, string | number> = { threshold };
    if (shopId != null) p['shop_id'] = shopId;
    return this.http
      .get<any>(`${BASE}/low-stock`, { params: p })
      .pipe(map(r => ({ items: r.data as LowStockRow[], threshold: r.threshold as number })));
  }

  getSupplies(filters: {
    supplier_id?: number | null;
    search?:      string;
    from?:        string;
    to?:          string;
    page?:        number;
    per_page?:    number;
  } = {}) {
    const p: Record<string, string | number> = {};
    if (filters.supplier_id != null) p['supplier_id'] = filters.supplier_id;
    if (filters.search)              p['search']      = filters.search;
    if (filters.from)                p['from']        = filters.from;
    if (filters.to)                  p['to']          = filters.to;
    if (filters.page)                p['page']        = filters.page;
    if (filters.per_page)            p['per_page']    = filters.per_page;
    return this.http
      .get<any>(`${BASE}/supplies`, { params: p })
      .pipe(map(r => r.data as SupplyPage));
  }
}
