import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api';

export interface ProductSummary {
  general: {
    id: number; name: string; sku: string | null; barcode: string | null;
    category: string | null; product_type: string; image: string | null;
    is_active: boolean; notes: string | null; description: string | null;
  };
  inventory: {
    current_stock: number; reserved_quantity: number; available_quantity: number;
    minimum_stock: number | null; inventory_value: number; last_inventory_update: string | null;
  } | null;
  sales: {
    sales_count: number; total_quantity_sold: number; revenue: number; average_selling_price: number | null;
  };
  compound_usage: {
    most_used_oils: { id: number; name: string; times_used: number; total_qty: number }[];
    most_used_bottles: { id: number; name: string; times_used: number }[];
  } | null;
}

export interface PurchaseHistoryRow {
  supply_id: number; date: string; supplier_name: string;
  quantity: number; unit_price: number; total_cost: number; branch_name: string;
}

export interface MovementRow {
  date: string; type: 'purchase' | 'sale'; quantity: number;
  user_name: string | null; branch_name: string; ref_id: number;
}

export interface SupplierHistoryRow {
  supplier_id: number; supplier_name: string; purchase_count: number;
  total_purchased_quantity: number; average_purchase_price: number; latest_purchase_price: number | null;
}

export interface ProductAnalytics {
  purchase_trend: { month: string; qty: number; value: number }[];
  sales_trend: { month: string; qty: number; revenue: number }[];
  price_trend: { date: string; price: number }[];
}

interface Paginated<T> { data: T[]; current_page: number; last_page: number; total: number; }

@Injectable({ providedIn: 'root' })
export class ProductDetailService {
  private http = inject(HttpClient);

  summary(id: number): Observable<ProductSummary> {
    return this.http.get<any>(`${API_BASE}/products/${id}/detail`).pipe(map((r) => r.data));
  }

  purchaseHistory(id: number, params: { page?: number; per_page?: number; search?: string; sort?: string; direction?: string } = {}): Observable<Paginated<PurchaseHistoryRow>> {
    // HttpClient serializes `undefined` values as the literal string
    // "undefined" when given a plain object — strip them so an empty
    // search/sort doesn't get sent (and matched) as a real filter value.
    const cleaned: Record<string, string | number> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) cleaned[k] = v; });
    return this.http.get<any>(`${API_BASE}/products/${id}/purchase-history`, { params: cleaned }).pipe(map((r) => r.data));
  }

  movements(id: number, page = 1): Observable<Paginated<MovementRow>> {
    return this.http.get<any>(`${API_BASE}/products/${id}/movements`, { params: { page } }).pipe(map((r) => r.data));
  }

  supplierHistory(id: number): Observable<SupplierHistoryRow[]> {
    return this.http.get<any>(`${API_BASE}/products/${id}/supplier-history`).pipe(map((r) => r.data));
  }

  analytics(id: number): Observable<ProductAnalytics> {
    return this.http.get<any>(`${API_BASE}/products/${id}/analytics`).pipe(map((r) => r.data));
  }
}
