import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api/hr/reports/advances';

export interface AdvanceReportRow {
  id: number;
  employee_name: string; employee_email: string;
  branch_name: string;
  paying_safe_name: string;
  receiving_safe_names: string[];
  status: string; status_label: string;
  amount: number; remaining_balance: number;
  creator_name: string; date: string;
}

export interface AdvanceReportFilters {
  from?: string; to?: string;
  user_id?: number; shop_id?: number;
  paying_safe_id?: number; receiving_safe_id?: number;
  status?: string; creator_id?: number; search?: string;
}

@Injectable({ providedIn: 'root' })
export class SalaryAdvanceReportService {
  private http = inject(HttpClient);

  private clean(params: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });
    return cleaned;
  }

  data(filters: AdvanceReportFilters): Observable<AdvanceReportRow[]> {
    return this.http.get<any>(API_BASE, { params: this.clean(filters) }).pipe(map((r) => r.data));
  }
}
