import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../enviroment';

export interface ConventionBody {
  amount: number;
  shop_id?: number;
  admin_id?: number;
}

export interface WithdrawBody {
  manager_id?: number;
  amount: number;
  reason: string;
  notes?: string;
  date?: string;
}

export interface TransactionFilters {
  type?: string;
  manager_id?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

@Injectable({ providedIn: 'root' })
export class ConventionService {
  private http = inject(HttpClient);
  private base = environment.apiUrl.conventions;
  private managerBase = `${environment.apiUrl.managerBase}/conventions`;

  // ── Admin: Conventions ──────────────────────────────────────────────────────

  getAll(params?: any): Observable<any> {
    return this.http.get<any>(this.base, { params: params as any });
  }

  getByShop(shopId: number): Observable<any> {
    return this.http.get<any>(`${this.base}/shop/${shopId}`);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/show/${id}`);
  }

  create(body: ConventionBody): Observable<any> {
    return this.http.post<any>(`${this.base}/create`, body);
  }

  update(id: number, body: Partial<ConventionBody>): Observable<any> {
    return this.http.put<any>(`${this.base}/update/${id}`, body);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/destroy/${id}`);
  }

  // ── Admin: Transactions ─────────────────────────────────────────────────────

  getTransactions(id: number, params?: TransactionFilters): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}/transactions`, { params: params as any });
  }

  createTransaction(id: number, body: WithdrawBody): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/transactions`, body);
  }

  updateTransaction(txId: number, body: Partial<WithdrawBody>): Observable<any> {
    return this.http.put<any>(`${this.base}/transactions/${txId}`, body);
  }

  deleteTransaction(txId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/transactions/${txId}`);
  }

  // ── Manager: own branch convention ──────────────────────────────────────────

  getManagerConventions(): Observable<any> {
    return this.http.get<any>(this.managerBase);
  }

  getManagerConvention(id: number): Observable<any> {
    return this.http.get<any>(`${this.managerBase}/${id}`);
  }

  getManagerTransactions(id: number, params?: TransactionFilters): Observable<any> {
    return this.http.get<any>(`${this.managerBase}/${id}/transactions`, { params: params as any });
  }

  managerWithdraw(id: number, body: WithdrawBody): Observable<any> {
    return this.http.post<any>(`${this.managerBase}/${id}/withdraw`, body);
  }
}
