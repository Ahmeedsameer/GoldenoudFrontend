import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/waste';

export type WasteReason = 'broken' | 'expired' | 'leakage' | 'lost' | 'damaged_during_transfer' | 'other';

export interface WasteRecord {
  id: number; shop_id: number; product_id: number; quantity: number; reason: WasteReason;
  date: string; estimated_value: number; notes: string | null;
  shop?: { id: number; name: string }; product?: { id: number; name: string; sku: string | null };
  user?: { id: number; name: string };
}

export interface WasteRecordPage { data: WasteRecord[]; current_page: number; last_page: number; total: number; per_page: number; }

export interface WasteFilters { shop_id?: number; reason?: string; from?: string; to?: string; page?: number; per_page?: number; }

@Injectable({ providedIn: 'root' })
export class WasteService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  list(filters: WasteFilters): Observable<WasteRecordPage> {
    return this.http.get<any>(API_BASE, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }

  register(payload: { shop_id: number; product_id: number; quantity: number; reason: WasteReason; date?: string; notes?: string }): Observable<WasteRecord> {
    return this.http.post<any>(API_BASE, payload).pipe(map((r) => r.data));
  }
}
