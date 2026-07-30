import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

const API_BASE = `${environment.apiBaseUrl}/admin/reports/payment-methods`;

/** Payment Methods module reports — Payment Method Report, Card Fees Report, Bank Charges Report. */
@Injectable({ providedIn: 'root' })
export class PaymentMethodReportService {
  private http = inject(HttpClient);

  getPaymentMethods(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(API_BASE, { params });
  }

  getCardFees(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${API_BASE}/card-fees`, { params });
  }

  getBankCharges(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${API_BASE}/bank-charges`, { params });
  }

  getBranchPayments(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${API_BASE}/branch-payments`, { params });
  }

  getCurrencyReport(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${API_BASE}/currency`, { params });
  }

  /** Current safe balance broken down by currency + payment method — reuses SafeService::getBalancesByPaymentMethod(). */
  getSafeBalance(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${API_BASE}/safe-balance`, { params });
  }

  /** Every transfer between two child safes (payment methods), same-branch or cross-branch. */
  getChildTransfers(params?: Record<string, any>): Observable<any> {
    return this.http.get<any>(`${API_BASE}/child-transfers`, { params });
  }
}
