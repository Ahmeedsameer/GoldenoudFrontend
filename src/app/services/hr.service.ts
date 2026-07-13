import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, retry } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api';

export interface EmployeePayload {
  name: string;
  email: string;
  password?: string;
  phone?: string | null;
  role: 'manager' | 'sales';
  status?: 'active' | 'inactive';
  base_salary?: number | null;
  personal_commission_percent?: number | null;
  hire_date?: string | null;
  monthly_leave_allowance?: number | null;
  hr_notes?: string | null;
  shop_id?: number | null; // primary branch
}

/**
 * HR & Payroll — Admin employee management API client.
 */
@Injectable({ providedIn: 'root' })
export class HrService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/hr`;

  // ── Employees ──────────────────────────────────────────────
  getEmployees(params: any): Observable<any> {
    // Backend wraps the paginator in { message, data: <paginator> }; unwrap so
    // ListManager/extractPagination receive the standard Laravel paginated shape.
    return this.http
      .get<any>(`${this.base}/employees`, { params })
      .pipe(retry(2), map((res) => res?.data ?? res));
  }

  getEmployee(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/employees/${id}`).pipe(retry(2));
  }

  createEmployee(payload: EmployeePayload): Observable<any> {
    return this.http.post<any>(`${this.base}/employees`, payload);
  }

  updateEmployee(id: number, payload: Partial<EmployeePayload>): Observable<any> {
    return this.http.put<any>(`${this.base}/employees/${id}`, payload);
  }

  toggleStatus(id: number): Observable<any> {
    return this.http.put<any>(`${this.base}/employees/${id}/toggle-status`, {});
  }

  // ── Employee transfers ─────────────────────────────────────
  getTransfers(params: any): Observable<any> {
    return this.http
      .get<any>(`${this.base}/transfers`, { params })
      .pipe(retry(2), map((res) => res?.data ?? res));
  }

  createTransfer(payload: {
    user_id: number;
    temporary_branch_id: number;
    start_date: string;
    end_date: string;
    reason?: string | null;
    notes?: string | null;
  }): Observable<any> {
    return this.http.post<any>(`${this.base}/transfers`, payload);
  }

  approveTransfer(id: number): Observable<any> {
    return this.http.put<any>(`${this.base}/transfers/${id}/approve`, {});
  }

  cancelTransfer(id: number): Observable<any> {
    return this.http.put<any>(`${this.base}/transfers/${id}/cancel`, {});
  }

  // ── Attendance ─────────────────────────────────────────────
  getAttendanceRoster(params: { date?: string; shop_id?: number }): Observable<any> {
    return this.http
      .get<any>(`${this.base}/attendance`, { params: params as any })
      .pipe(retry(2), map((res) => res?.data ?? res));
  }

  markAttendance(payload: { user_id: number; date: string; status: string; note?: string }): Observable<any> {
    return this.http.put<any>(`${this.base}/attendance`, payload);
  }

  // ── Leave management ───────────────────────────────────────
  getLeaves(params: any): Observable<any> {
    return this.http
      .get<any>(`${this.base}/leaves`, { params })
      .pipe(retry(2), map((res) => res?.data ?? res));
  }

  approveLeave(id: number, note?: string): Observable<any> {
    return this.http.put<any>(`${this.base}/leaves/${id}/approve`, { note });
  }

  rejectLeave(id: number, note?: string): Observable<any> {
    return this.http.put<any>(`${this.base}/leaves/${id}/reject`, { note });
  }

  // employee self-service
  submitLeave(payload: { start_date: string; end_date: string; type?: string; reason?: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/leaves`, payload);
  }

  myLeaves(): Observable<any> {
    return this.http.get<any>(`${this.base}/leaves/mine`).pipe(map((res) => res?.data ?? res));
  }

  mySummary(): Observable<any> {
    return this.http.get<any>(`${this.base}/me/summary`).pipe(map((res) => res?.data ?? res));
  }

  // ── Payroll ────────────────────────────────────────────────
  getPayrolls(params: any): Observable<any> {
    return this.http.get<any>(`${this.base}/payrolls`, { params }).pipe(retry(2), map((res) => res?.data ?? res));
  }

  getPayroll(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/payrolls/${id}`).pipe(map((res) => res?.data ?? res));
  }

  generatePayroll(payload: { year: number; month: number; user_id?: number }): Observable<any> {
    return this.http.post<any>(`${this.base}/payrolls/generate`, payload);
  }

  lockPayroll(id: number): Observable<any> { return this.http.put<any>(`${this.base}/payrolls/${id}/lock`, {}); }
  unlockPayroll(id: number): Observable<any> { return this.http.put<any>(`${this.base}/payrolls/${id}/unlock`, {}); }
  markPaidPayroll(id: number): Observable<any> { return this.http.put<any>(`${this.base}/payrolls/${id}/paid`, {}); }

  // ── Deduction settings ─────────────────────────────────────
  getDeductionSettings(): Observable<any> {
    return this.http.get<any>(`${this.base}/deduction-settings`).pipe(map((res) => res?.data ?? res));
  }

  updateDeductionSetting(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.base}/deduction-settings/${id}`, payload);
  }

  // ── Reports ────────────────────────────────────────────────
  getReport(type: string, params: any): Observable<any> {
    return this.http.get<any>(`${this.base}/reports/${type}`, { params }).pipe(map((res) => res?.data ?? res));
  }

  exportReport(type: string, params: any, format: 'csv' | 'pdf'): Observable<Blob> {
    return this.http.get(`${this.base}/reports/${type}/export`, {
      params: { ...params, format },
      responseType: 'blob',
    });
  }
}
