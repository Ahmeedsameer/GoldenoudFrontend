import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/transfers';
const STOCK_REQUEST_API_BASE = 'http://127.0.0.1:8000/api/branch-operations/stock-requests';
const REQUIRED_MATERIALS_API_BASE = 'http://127.0.0.1:8000/api/branch-operations/required-materials';
const REQUIRED_MATERIALS_REPORT_API_BASE = 'http://127.0.0.1:8000/api/admin/reports/required-materials';

/** One row in the Branch Required Materials page — see RequiredMaterialsService::forBranch(). */
export interface RequiredMaterialRow {
  product_id: number;
  name: string;
  category: string | null;
  branch_qty: number;
  warehouse_qty: number;
  minimum_quantity: number | null;
  last_purchase_price: number | null;
  is_priced: boolean;
  can_request: boolean;
  existing_request: { id: number; status: string; status_label: string } | null;
}

export interface RequiredMaterialsData {
  summary: { out_of_stock: number; low_stock: number; needs_pricing: number; pending_requests: number };
  out_of_stock: RequiredMaterialRow[];
  low_stock: RequiredMaterialRow[];
  needs_pricing: RequiredMaterialRow[];
}

export type TransferStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'preparing' | 'shipped' | 'received' | 'closed';
export type TransferPriority = 'low' | 'normal' | 'high' | 'urgent';

/** Shared across the general Transfer screens and the Stock Request screens
 *  (a Stock Request IS a TransferRequest — see storeStockRequest() on the
 *  backend) so both present the exact same status/priority vocabulary. */
export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  draft: 'مسودة', submitted: 'بانتظار الموافقة', approved: 'تمت الموافقة', rejected: 'مرفوض',
  preparing: 'قيد التجهيز', shipped: 'تم الشحن', received: 'تم الاستلام', closed: 'مغلق',
};
export const TRANSFER_PRIORITY_LABELS: Record<string, string> = {
  low: 'منخفضة', normal: 'عادية', high: 'مرتفعة', urgent: 'عاجلة',
};
export const TRANSFER_STATUS_CLASSES: Record<TransferStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
  submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  rejected: 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-300',
  preparing: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  shipped: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  received: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  closed: 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300',
};

export interface TransferRequestItem {
  id: number; product_id: number;
  product?: { id: number; name: string; sku: string | null; scalar: string | null };
  unit: string | null; available_stock_at_request: number; requested_quantity: number; approved_quantity: number | null;
  received_quantity: number | null; missing_quantity: number | null; damaged_quantity: number | null; receiving_notes: string | null;
}

export interface TransferRequestLog {
  id: number; user: { id: number; name: string } | null; action: string;
  previous_status: string | null; new_status: string | null; notes: string | null; created_at: string;
}

export interface InternalTransferInvoice {
  id: number; invoice_number: string; reference_value: number; status: string; date: string;
}

export interface TransferRequest {
  id: number; request_number: string; status: TransferStatus; priority: TransferPriority;
  source_shop_id: number; destination_shop_id: number;
  source_shop?: { id: number; name: string }; destination_shop?: { id: number; name: string };
  requested_by_user?: { id: number; name: string }; approved_by_user?: { id: number; name: string } | null;
  requested_date: string; notes: string | null; is_emergency?: boolean;
  cancelled_at?: string | null; cancelled_by?: number | null;
  items: TransferRequestItem[]; logs?: TransferRequestLog[]; internal_invoice?: InternalTransferInvoice | null;
  created_at: string;
}

export interface TransferRequestPage {
  data: TransferRequest[]; current_page: number; last_page: number; total: number; per_page: number;
}

export interface TransferRequestFilters {
  status?: string; shop_id?: number; page?: number; per_page?: number;
  /** Stock Requests view — every transfer sourced from the Main Warehouse (see backend baseQuery()). */
  warehouse_source?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TransferRequestService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  list(filters: TransferRequestFilters): Observable<TransferRequestPage> {
    return this.http.get<any>(API_BASE, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }

  get(id: number): Observable<TransferRequest> {
    return this.http.get<any>(`${API_BASE}/${id}`).pipe(map((r) => r.data));
  }

  availableStock(productId: number, shopId: number): Observable<number> {
    return this.http.get<any>(`${API_BASE}/available-stock`, { params: { product_id: productId, shop_id: shopId } }).pipe(map((r) => r.data.available));
  }

  create(payload: {
    source_shop_id: number; destination_shop_id: number; requested_date?: string; priority?: TransferPriority;
    notes?: string; submit?: boolean; items: { product_id: number; requested_quantity: number }[];
  }): Observable<TransferRequest> {
    return this.http.post<any>(API_BASE, payload).pipe(map((r) => r.data));
  }

  /**
   * Branch Manager entry point — creates a TransferRequest exactly like
   * create() above, except source (Main Warehouse) and destination (the
   * caller's own branch) are hard-locked server-side, and it always submits
   * immediately (a Stock Request has no draft concept). See
   * TransferRequestController::storeStockRequest().
   */
  createStockRequest(payload: {
    requested_date?: string; priority?: TransferPriority; notes?: string;
    items: { product_id: number; requested_quantity: number }[];
  }): Observable<TransferRequest> {
    return this.http.post<any>(STOCK_REQUEST_API_BASE, payload).pipe(map((r) => r.data));
  }

  submit(id: number): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/submit`, {}).pipe(map((r) => r.data)); }
  approve(id: number, notes?: string): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/approve`, { notes }).pipe(map((r) => r.data)); }
  reject(id: number, reason: string): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/reject`, { reason }).pipe(map((r) => r.data)); }
  prepare(id: number): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/prepare`, {}).pipe(map((r) => r.data)); }
  ship(id: number): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/ship`, {}).pipe(map((r) => r.data)); }
  close(id: number): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/close`, {}).pipe(map((r) => r.data)); }
  cancel(id: number, reason: string): Observable<TransferRequest> { return this.http.post<any>(`${API_BASE}/${id}/cancel`, { reason }).pipe(map((r) => r.data)); }

  receive(id: number, payload: {
    notes?: string;
    items: { item_id: number; received_quantity: number; missing_quantity?: number; damaged_quantity?: number; notes?: string }[];
  }): Observable<TransferRequest> {
    return this.http.post<any>(`${API_BASE}/${id}/receive`, payload).pipe(map((r) => r.data));
  }

  /**
   * Turns missing/damaged quantity reported in receive() above into real
   * WasteRecord rows — one entry per flagged item, covering that item's full
   * missing+damaged total. See TransferRequestController::registerReceivingWaste().
   */
  registerReceivingWaste(id: number, entries: { item_id: number; reason: string; notes?: string }[]): Observable<TransferRequest> {
    return this.http.post<any>(`${API_BASE}/${id}/receiving-waste`, { entries }).pipe(map((r) => r.data));
  }

  // ── Branch Required Materials ────────────────────────────────────────────
  /** Manager — own branch only (resolved server-side from the authenticated user). */
  getRequiredMaterials(): Observable<RequiredMaterialsData> {
    return this.http.get<any>(REQUIRED_MATERIALS_API_BASE).pipe(map((r) => r.data));
  }

  /** Admin — any branch. PDF/Excel export uses <app-report-toolbar> (ReportExportService), same as every other admin report. */
  getRequiredMaterialsReport(shopId: number): Observable<RequiredMaterialsData> {
    return this.http.get<any>(REQUIRED_MATERIALS_REPORT_API_BASE, { params: { shop_id: shopId } }).pipe(map((r) => r.data));
  }
}
