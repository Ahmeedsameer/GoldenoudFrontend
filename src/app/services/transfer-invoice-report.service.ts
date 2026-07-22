import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/branch-operations/reports/transfer-invoices';

export interface InvoiceReportRow {
  invoice_number: string; request_number: string; date: string; generated_at: string;
  source_name: string; destination_name: string;
  transfer_type: 'branch_branch' | 'warehouse_branch' | 'emergency'; transfer_type_label: string;
  status: string; creator_name: string; approver_name: string; receiver_name: string; reference_value: number;
}

export interface InvoiceReportFilters {
  from?: string; to?: string; source_shop_id?: number; destination_shop_id?: number;
  transfer_type?: string; status?: string; creator_id?: number; approver_id?: number; receiver_id?: number; search?: string;
}

@Injectable({ providedIn: 'root' })
export class TransferInvoiceReportService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  data(filters: InvoiceReportFilters): Observable<InvoiceReportRow[]> {
    return this.http.get<any>(API_BASE, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }
}
