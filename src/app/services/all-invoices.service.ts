import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const API_BASE = 'http://localhost:8000/api/admin/all-invoices';

export type AllInvoicesType = 'all' | 'sale' | 'purchase' | 'internal_transfer';

export interface AllInvoiceRow {
  type: 'sale' | 'purchase' | 'internal_transfer';
  type_label: string;
  id: number;
  number: string;
  date: string;
  time: string;
  timestamp: number;
  party: string | null;
  branch: string | null;
  created_by: string | null;
  amount: number;
  status: string;
  status_label: string;
  is_cancelled: boolean;
  link: string;
  /** Sale rows only — bank processing fee expected to be deducted, and cost/profit. Report-only, never printed. */
  bank_fee?: number;
  total_cost?: number;
  total_profit?: number;
}

/** Admin-only unified timeline over sales invoices, purchase invoices, and internal
 *  transfer invoices — see AdminAllInvoicesController for why these can't be a single SQL query. */
@Injectable({ providedIn: 'root' })
export class AllInvoicesService {
  private http = inject(HttpClient);

  getAll(params: Record<string, any>): Observable<any> {
    return this.http.get<any>(API_BASE, { params });
  }
}
