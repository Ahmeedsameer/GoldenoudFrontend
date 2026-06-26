import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../enviroment';

export interface SafeTransactionBody {
  currency_id: number;
  amount: number;
  reason_id: number;
  note?: string;
}

export interface TransactionFilters {
  type?: string;
  direction?: 'in' | 'out';
  currency_id?: number;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

@Injectable({ providedIn: 'root' })
export class SafeService {
  private http = inject(HttpClient);

  private safe               = environment.apiUrl.safe;
  private currencies         = environment.apiUrl.currencies;
  private safeTypes          = environment.apiUrl.safeTypes;
  private transactionReasons = environment.apiUrl.transactionReasons;
  private safeManagement     = environment.apiUrl.safeManagement;
  private managerBase        = 'http://127.0.0.1:8000/api/manager';

  // ── Currencies ────────────────────────────────────────────────────────────────

  getCurrencies(params?: { active_only?: boolean }): Observable<any> {
    return this.http.get<any>(this.currencies, { params: params as any });
  }

  createCurrency(body: { code: string; name: string; symbol: string; rate: number; is_active: boolean }): Observable<any> {
    return this.http.post<any>(this.currencies, body);
  }

  updateCurrency(id: number, body: Partial<{ name: string; symbol: string; rate: number; is_active: boolean }>): Observable<any> {
    return this.http.put<any>(`${this.currencies}/${id}`, body);
  }

  // ── Safe Types ────────────────────────────────────────────────────────────────

  getSafeTypes(params?: { kind?: 'physical' | 'virtual' }): Observable<any> {
    return this.http.get<any>(this.safeTypes, { params: params as any });
  }

  createSafeType(body: { name: string; kind: 'physical' | 'virtual'; is_active: boolean }): Observable<any> {
    return this.http.post<any>(this.safeTypes, body);
  }

  updateSafeType(id: number, body: Partial<{ name: string; is_active: boolean }>): Observable<any> {
    return this.http.put<any>(`${this.safeTypes}/${id}`, body);
  }

  // ── Transaction Reasons ───────────────────────────────────────────────────────

  getReasons(params?: { direction?: string; active_only?: boolean }): Observable<any> {
    return this.http.get<any>(this.transactionReasons, { params: params as any });
  }

  createReason(body: { name: string; direction: string; is_active: boolean }): Observable<any> {
    return this.http.post<any>(this.transactionReasons, body);
  }

  updateReason(id: number, body: Partial<{ name: string; direction: string; is_active: boolean }>): Observable<any> {
    return this.http.put<any>(`${this.transactionReasons}/${id}`, body);
  }

  // ── Safe Management ───────────────────────────────────────────────────────────

  getSafes(params?: { shop_id?: number | string }): Observable<any> {
    return this.http.get<any>(this.safeManagement, { params: params as any });
  }

  createSafe(body: { safe_type_id: number; shop_id?: number | null }): Observable<any> {
    return this.http.post<any>(this.safeManagement, body);
  }

  toggleSafe(id: number): Observable<any> {
    return this.http.put<any>(`${this.safeManagement}/${id}/toggle`, {});
  }

  // ── Admin Safe Operations ─────────────────────────────────────────────────────

  getShopSafes(shopId: number | undefined): Observable<any> {
    return this.http.get<any>(`${this.safe}/shops/${shopId}`);
  }

  getSafeById(safeId: number): Observable<any> {
    return this.http.get<any>(`${this.safe}/${safeId}`);
  }

  getAdminTransactions(safeId: number, params?: TransactionFilters): Observable<any> {
    return this.http.get<any>(`${this.safe}/${safeId}/transactions`, { params: params as any });
  }

  adminDeposit(safeId: number, body: SafeTransactionBody): Observable<any> {
    return this.http.post<any>(`${this.safe}/${safeId}/deposit`, body);
  }

  adminWithdraw(safeId: number, body: SafeTransactionBody): Observable<any> {
    return this.http.post<any>(`${this.safe}/${safeId}/withdraw`, body);
  }

  transfer(body: { from_safe_id: number; to_safe_id: number; currency_id: number; amount: number; note?: string }): Observable<any> {
    return this.http.post<any>(`${this.safe}/transfer`, body);
  }

  // ── Manager Lookups (currencies / reasons accessible by manager role) ───────

  getManagerCurrencies(params?: { active_only?: boolean }): Observable<any> {
    return this.http.get<any>(`${this.managerBase}/currencies`, { params: params as any });
  }

  getManagerReasons(params?: { direction?: string; active_only?: boolean }): Observable<any> {
    return this.http.get<any>(`${this.managerBase}/transaction-reasons`, { params: params as any });
  }

  // ── Manager Safe Operations (all under /api/manager/) ────────────────────────

  getMyShopSafes(): Observable<any> {
    return this.http.get<any>(`${this.managerBase}/safe/my-shop`);
  }

  getManagerTransactions(safeId: number, params?: TransactionFilters): Observable<any> {
    return this.http.get<any>(`${this.managerBase}/safe/my-shop/${safeId}/transactions`, { params: params as any });
  }

  managerDeposit(safeId: number, body: SafeTransactionBody): Observable<any> {
    return this.http.post<any>(`${this.managerBase}/safe/my-shop/${safeId}/deposit`, body);
  }

  managerWithdraw(safeId: number, body: SafeTransactionBody): Observable<any> {
    return this.http.post<any>(`${this.managerBase}/safe/my-shop/${safeId}/withdraw`, body);
  }
}
