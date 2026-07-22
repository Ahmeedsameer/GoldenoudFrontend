import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/reports/inventory-audit';

export interface InventoryAuditRow {
  date: string; user: string | null; shop_name: string; product_name: string; sku: string;
  operation: string; movement_type: string; old_quantity: number; new_quantity: number;
  difference: number; reason: string | null; reference_number: string;
}

export interface InventoryAuditKpis {
  total_operations: number; adjustments: number; waste_events: number; transfer_events: number; count_sessions: number;
}

export interface InventoryAuditReportData {
  period: { from: string; to: string };
  kpis: InventoryAuditKpis;
  rows: InventoryAuditRow[];
}

export interface InventoryAuditFilters {
  from?: string; to?: string; shop_id?: number; product_id?: number; category_id?: number; supplier_id?: number;
}

@Injectable({ providedIn: 'root' })
export class InventoryAuditReportService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  data(filters: InventoryAuditFilters): Observable<InventoryAuditReportData> {
    return this.http.get<any>(API_BASE, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }
}
