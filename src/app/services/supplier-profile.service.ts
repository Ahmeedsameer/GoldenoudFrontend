import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/stock/suppliers';

export interface SupplierProfile {
  general: { id: number; name: string; phone: string; notes: string | null };
  statistics: {
    total_purchases: number; total_purchase_value: number; total_purchased_quantity: number;
    average_purchase_price: number | null; latest_purchase_price: number | null;
  };
}

export interface SupplierProductRow {
  id: number; name: string; sku: string | null; purchase_count: number;
  total_purchased_quantity: number; average_purchase_price: number; last_purchased_at: string;
}

export interface SupplierProducts {
  RAW_MATERIAL: SupplierProductRow[]; PACKAGING: SupplierProductRow[]; READY_PRODUCT: SupplierProductRow[];
}

export interface SupplierAnalytics {
  most_purchased_category: string | null; most_purchased_product: string | null;
  monthly_purchase_value: { month: string; value: number; purchase_count: number }[];
  purchase_frequency: number | null;
  price_trend: { month: string; avg_price: number }[];
}

export interface SupplierInsightEntry { id: number; name: string; value: number | string; }
export interface SupplierGlobalInsights {
  best_supplier_by_type: Record<string, SupplierInsightEntry | null>;
  lowest_average_price: SupplierInsightEntry | null;
  highest_purchase_volume: SupplierInsightEntry | null;
  most_frequently_used: SupplierInsightEntry | null;
  latest_supplier: SupplierInsightEntry | null;
  most_stable_pricing: SupplierInsightEntry | null;
}

@Injectable({ providedIn: 'root' })
export class SupplierProfileService {
  private http = inject(HttpClient);

  profile(id: number): Observable<SupplierProfile> {
    return this.http.get<any>(`${API_BASE}/${id}/profile`).pipe(map((r) => r.data));
  }

  products(id: number): Observable<SupplierProducts> {
    return this.http.get<any>(`${API_BASE}/${id}/profile/products`).pipe(map((r) => r.data));
  }

  analytics(id: number): Observable<SupplierAnalytics> {
    return this.http.get<any>(`${API_BASE}/${id}/profile/analytics`).pipe(map((r) => r.data));
  }

  globalInsights(): Observable<SupplierGlobalInsights> {
    return this.http.get<any>(`${API_BASE}/insights`).pipe(map((r) => r.data));
  }
}
