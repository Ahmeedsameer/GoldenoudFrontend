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

  // ── Weekly Schedule ────────────────────────────────────────
  getScheduleRoster(params: any): Observable<any> {
    return this.http.get<any>(`${this.base}/schedule`, { params }).pipe(map((res) => res?.data ?? res));
  }

  upsertScheduleEntry(payload: {
    user_id: number; date: string; type: string;
    shift_template_id?: number | null; start_time?: string | null; end_time?: string | null;
    shop_id?: number | null; notes?: string | null;
  }): Observable<any> {
    return this.http.put<any>(`${this.base}/schedule`, payload);
  }

  /** Save the whole week in ONE request. */
  bulkSaveSchedule(entries: Array<{
    user_id: number; date: string; type: string;
    shift_template_id?: number | null; start_time?: string | null; end_time?: string | null;
    shop_id?: number | null; notes?: string | null;
  }>): Observable<any> {
    return this.http.put<any>(`${this.base}/schedule/bulk`, { entries });
  }

  publishSchedule(params: any): Observable<any> {
    return this.http.post<any>(`${this.base}/schedule/publish`, {}, { params });
  }

  cancelSchedule(params: any): Observable<any> {
    return this.http.post<any>(`${this.base}/schedule/cancel`, {}, { params });
  }

  exportSchedule(params: any): Observable<Blob> {
    return this.http.get(`${this.base}/schedule/export`, { params, responseType: 'blob' });
  }

  getShiftTemplates(): Observable<any> {
    return this.http.get<any>(`${this.base}/shift-templates`).pipe(map((res) => res?.data ?? res));
  }

  createShiftTemplate(payload: { name: string; color?: string; start_time: string; end_time: string; description?: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/shift-templates`, payload);
  }

  /** Admin management view: every template, active or archived, with future-usage flag. */
  getAllShiftTemplates(): Observable<any> {
    return this.http.get<any>(`${this.base}/shift-templates/all`).pipe(map((res) => res?.data ?? res));
  }

  updateShiftTemplate(id: number, payload: { name?: string; color?: string; start_time?: string; end_time?: string; description?: string | null; scope?: 'future' | 'unpublished' | 'all' }): Observable<any> {
    return this.http.put<any>(`${this.base}/shift-templates/${id}`, payload);
  }

  archiveShiftTemplate(id: number): Observable<any> {
    return this.http.put<any>(`${this.base}/shift-templates/${id}/archive`, {});
  }

  restoreShiftTemplate(id: number): Observable<any> {
    return this.http.put<any>(`${this.base}/shift-templates/${id}/restore`, {});
  }

  deleteShiftTemplate(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/shift-templates/${id}`);
  }

  // ── Self-service: My Schedule / My Attendance / My Profile / My Sales ──
  myScheduleWeek(date?: string): Observable<any> {
    return this.http.get<any>(`${this.base}/schedule/mine`, { params: date ? { date } : {} }).pipe(map((res) => res?.data ?? res));
  }

  myAttendance(params: { year?: number; month?: number }): Observable<any> {
    return this.http.get<any>(`${this.base}/attendance/mine`, { params: params as any }).pipe(map((res) => res?.data ?? res));
  }

  myProfile(): Observable<any> {
    return this.http.get<any>(`${this.base}/me/profile`).pipe(map((res) => res?.data ?? res));
  }

  mySales(params: { year?: number; month?: number }): Observable<any> {
    return this.http.get<any>(`${this.base}/me/sales`, { params: params as any }).pipe(map((res) => res?.data ?? res));
  }

  myTimeline(): Observable<any> {
    return this.http.get<any>(`${this.base}/me/timeline`).pipe(map((res) => res?.data ?? res));
  }

  employeeTimeline(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/employees/${id}/timeline`).pipe(map((res) => res?.data ?? res));
  }

  // ── Leave lifecycle (Phase 10) ──────────────────────────────
  cancelLeave(id: number): Observable<any> {
    return this.http.put<any>(`${this.base}/leaves/${id}/cancel`, {});
  }

  endLeaveEarly(id: number, end_date: string): Observable<any> {
    return this.http.put<any>(`${this.base}/leaves/${id}/end-early`, { end_date });
  }

  // ── Bonuses ──────────────────────────────────────────────────
  getBonuses(params: any): Observable<any> {
    return this.http.get<any>(`${this.base}/bonuses`, { params }).pipe(map((res) => res?.data ?? res));
  }

  myBonuses(): Observable<any> {
    return this.http.get<any>(`${this.base}/bonuses/mine`).pipe(map((res) => res?.data ?? res));
  }

  createBonus(payload: { user_id: number; amount: number; reason: string; date: string; notes?: string | null }): Observable<any> {
    return this.http.post<any>(`${this.base}/bonuses`, payload);
  }

  updateBonus(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.base}/bonuses/${id}`, payload);
  }

  deleteBonus(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/bonuses/${id}`);
  }

  // ── Penalties ────────────────────────────────────────────────
  getPenalties(params: any): Observable<any> {
    return this.http.get<any>(`${this.base}/penalties`, { params }).pipe(map((res) => res?.data ?? res));
  }

  myPenalties(): Observable<any> {
    return this.http.get<any>(`${this.base}/penalties/mine`).pipe(map((res) => res?.data ?? res));
  }

  createPenalty(payload: { user_id: number; amount: number; reason: string; date: string; notes?: string | null }): Observable<any> {
    return this.http.post<any>(`${this.base}/penalties`, payload);
  }

  updatePenalty(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.base}/penalties/${id}`, payload);
  }

  deletePenalty(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/penalties/${id}`);
  }

  // ── Salary Advances ──────────────────────────────────────────
  requestAdvance(payload: { requested_amount: number; reason: string; notes?: string | null; request_date?: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/advances`, payload);
  }

  myAdvances(): Observable<any> {
    return this.http.get<any>(`${this.base}/advances/mine`).pipe(map((res) => res?.data ?? res));
  }

  getAdvances(params: any): Observable<any> {
    return this.http.get<any>(`${this.base}/advances`, { params }).pipe(map((res) => res?.data ?? res));
  }

  getAdvance(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/advances/${id}`).pipe(map((res) => res?.data ?? res));
  }

  rejectAdvance(id: number, reason?: string): Observable<any> {
    return this.http.put<any>(`${this.base}/advances/${id}/reject`, { reason });
  }

  approveAdvance(id: number, plan: {
    approved_amount: number; mode: 'date_range' | 'fixed_amount' | 'fixed_months' | 'custom';
    monthly_amount?: number; months?: number; schedule?: number[];
    start_year?: number; start_month?: number; end_year?: number; end_month?: number;
  }): Observable<any> {
    return this.http.put<any>(`${this.base}/advances/${id}/approve`, plan);
  }

  updateAdvancePlan(id: number, plan: {
    mode: 'date_range' | 'fixed_amount' | 'fixed_months' | 'custom';
    monthly_amount?: number; months?: number; schedule?: number[];
    start_year?: number; start_month?: number; end_year?: number; end_month?: number;
  }): Observable<any> {
    return this.http.put<any>(`${this.base}/advances/${id}/plan`, plan);
  }

  cancelAdvance(id: number): Observable<any> {
    return this.http.put<any>(`${this.base}/advances/${id}/cancel`, {});
  }

  recordAdvanceRepayment(id: number, payload: { amount: number; date: string; notes?: string | null }): Observable<any> {
    return this.http.post<any>(`${this.base}/advances/${id}/repayments`, payload);
  }
}
