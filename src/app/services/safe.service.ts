import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../enviroment';

@Injectable({ providedIn: 'root' })
export class SafeService {
  private http = inject(HttpClient);
  private base = environment.apiUrl.safe;

  // ── Admin endpoints ─────────────────────────────────────

  getShopSafe(shopId: number) {
    return this.http.get<any>(`${this.base}/shops/${shopId}`);
  }

  getShopTransactions(shopId: number, params: any) {
    return this.http.get<any>(`${this.base}/shops/${shopId}/transactions`, { params });
  }

  adminDeposit(shopId: number, amount: number, note?: string) {
    return this.http.post<any>(`${this.base}/shops/${shopId}/deposit`, { amount, note });
  }

  adminWithdraw(shopId: number, amount: number, note?: string) {
    return this.http.post<any>(`${this.base}/shops/${shopId}/withdraw`, { amount, note });
  }

  // ── Manager endpoints (scoped to own shop) ──────────────

  getMySafe() {
    return this.http.get<any>(`${this.base}/my-shop`);
  }

  getMyTransactions(params: any) {
    return this.http.get<any>(`${this.base}/my-shop/transactions`, { params });
  }

  managerDeposit(amount: number, note: string) {
    return this.http.post<any>(`${this.base}/my-shop/deposit`, { amount, note });
  }

  managerWithdraw(amount: number, note: string) {
    return this.http.post<any>(`${this.base}/my-shop/withdraw`, { amount, note });
  }
}
