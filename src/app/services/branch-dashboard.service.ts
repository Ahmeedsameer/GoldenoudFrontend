import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { TransferRequest } from './transfer-request.service';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations';

export interface DailyCount { date: string; count: number; }
export interface DailyValue { date: string; value: number; }
export interface AccuracyPoint { session_id: number; shop_name?: string | null; date: string; accuracy_percent: number | null; }

export interface BranchWarehouseSummary {
  requests: number; pending_requests: number; deliveries: number;
  history: { id: number; request_number: string; status: string; requested_date: string }[];
}

export interface AdminWarehouseSummary {
  shop_id: number; pending_requests: number; open_requests: number; shipments_today: number; delays: number;
  top_requested_products: { id: number; name: string; total_qty: number; request_count: number }[];
  top_requesting_branches: { id: number; name: string; request_count: number }[];
}

export interface BranchDashboardData {
  shop_id: number;
  pending_transfers: number;
  incoming_transfers: number;
  outgoing_transfers: number;
  pending_receipts: number;
  waiting_shipment: number;
  closed_count: number;
  rejected_count: number;
  internal_invoices_count: number;
  today_waste_count: number;
  today_waste_value: number;
  pending_inventory_counts: number;
  pending_adjustments: number;
  recent_requests: TransferRequest[];
  warehouse: BranchWarehouseSummary | null;
  today_transfers_count: number;
  items_sent_today: number;
  items_received_today: number;
  damaged_items_today: number;
  missing_items_today: number;
  inventory_accuracy_percent: number | null;
  charts: {
    transfers_this_week: DailyCount[];
    waste_trend: DailyValue[];
    inventory_accuracy_trend: AccuracyPoint[];
  };
}

export interface DelayedTransfer {
  id: number; request_number: string; status: string;
  source_shop?: { id: number; name: string }; destination_shop?: { id: number; name: string };
  created_at: string; shipped_at: string | null;
}

export interface BranchPerformanceRow {
  shop_id: number; shop_name: string;
  incoming: number; outgoing: number; waste_cost: number;
  inventory_accuracy: number | null; delayed_transfers: number; pending_requests: number;
}

export interface AdminLogisticsDashboardData {
  period: { from: string; to: string };
  total_transfers: number;
  by_status: Record<string, number>;
  waiting_approval_count: number;
  transfers_today_count: number;
  open_transfers_count: number;
  pending_shipment_count: number;
  pending_receiving_count: number;
  delayed: { submitted: DelayedTransfer[]; shipped: DelayedTransfer[]; total: number };
  most_sending_branch: { id: number; name: string; cnt: number } | null;
  most_receiving_branch: { id: number; name: string; cnt: number } | null;
  most_transferred_product: { id: number; name: string; total_qty: number } | null;
  waste_summary: { total_value: number; total_qty: number; by_reason: { reason: string; cnt: number; qty: number; value: number }[] };
  pending_inventory_counts: number;
  branch_performance: BranchPerformanceRow[];
  warehouse: AdminWarehouseSummary;
  charts: {
    transfers_per_day: DailyCount[];
    waste_trend: DailyValue[];
    adjustment_trend: DailyCount[];
    inventory_count_accuracy: AccuracyPoint[];
  };
}

@Injectable({ providedIn: 'root' })
export class BranchDashboardService {
  private http = inject(HttpClient);

  getBranchDashboard(shopId?: number | null): Observable<BranchDashboardData> {
    const params: Record<string, any> = {};
    if (shopId != null) params['shop_id'] = shopId;
    return this.http.get<any>(`${API_BASE}/dashboard`, { params }).pipe(map((r) => r.data));
  }

  getAdminLogisticsDashboard(from?: string, to?: string): Observable<AdminLogisticsDashboardData> {
    const params: Record<string, any> = {};
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<any>(`${API_BASE}/logistics-dashboard`, { params }).pipe(map((r) => r.data));
  }
}
