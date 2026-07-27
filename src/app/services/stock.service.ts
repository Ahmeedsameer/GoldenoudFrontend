import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, retry } from 'rxjs';
import {
  CreateSupplierPaymentRequest,
  CreateSupplyRequest,
  Goods,
  Supplier,
  SupplierContact,
  SupplierLedger,
  Supply,
  TransferRequest,
  TransferResponse,
  UpdateSupplyRequest,
} from '../models/stock.model';

const API_BASE = 'http://127.0.0.1:8000/api';

@Injectable({
  providedIn: 'root',
})
export class StockService {
  private http = inject(HttpClient);

  private suppliersUrl = `${API_BASE}/stock/suppliers`;
  private suppliesUrl = `${API_BASE}/stock/supplies`;
  private inventoryUrl = `${API_BASE}/stock/inventory`;
  private shopsUrl = `${API_BASE}/shops`;

  // ── Suppliers ─────────────────────────────────────────
  getSuppliers(params: any) {
    return this.http.get<any>(this.suppliersUrl, { params }).pipe(retry(2));
  }

  getSupplierById(id: number) {
    return this.http.get<any>(`${this.suppliersUrl}/show/${id}`).pipe(retry(2));
  }

  createSupplier(data: {
    name: string; phone: string; address: string;
    bank_account_number?: string; mobile_wallet?: string; instapay?: string; iban?: string;
    opening_balance?: number; notes?: string;
  }) {
    return this.http.post<any>(`${this.suppliersUrl}/create`, data);
  }

  updateSupplier(id: number, data: Partial<{
    name: string; phone: string; address: string;
    bank_account_number: string; mobile_wallet: string; instapay: string; iban: string;
    opening_balance: number; notes: string;
  }>) {
    return this.http.put<any>(`${this.suppliersUrl}/update/${id}`, data);
  }

  deleteSupplier(id: number) {
    return this.http.delete<any>(`${this.suppliersUrl}/destroy/${id}`);
  }

  // ── Supplier Contacts — no limit per supplier ──────────
  getSupplierContacts(supplierId: number) {
    return this.http.get<any>(`${this.suppliersUrl}/${supplierId}/contacts`).pipe(map((res) => (res.data || []) as SupplierContact[]));
  }

  addSupplierContact(supplierId: number, data: { name: string; phone: string; address: string; position?: string }) {
    return this.http.post<any>(`${this.suppliersUrl}/${supplierId}/contacts`, data);
  }

  updateSupplierContact(supplierId: number, contactId: number, data: { name: string; phone: string; address: string; position?: string }) {
    return this.http.put<any>(`${this.suppliersUrl}/${supplierId}/contacts/${contactId}`, data);
  }

  deleteSupplierContact(supplierId: number, contactId: number) {
    return this.http.delete<any>(`${this.suppliersUrl}/${supplierId}/contacts/${contactId}`);
  }

  // ── Supplier Ledger — purchase history, payment history, balances ─────
  getSupplierLedger(supplierId: number) {
    return this.http.get<any>(`${this.suppliersUrl}/${supplierId}/ledger`).pipe(map((res) => res.data as SupplierLedger));
  }

  // ── Supplier Payments — always against exactly ONE invoice ────────────
  getSupplierPayments(params?: any) {
    return this.http.get<any>(`${API_BASE}/stock/supplier-payments`, { params }).pipe(retry(2));
  }

  paySupplier(data: CreateSupplierPaymentRequest) {
    return this.http.post<any>(`${API_BASE}/stock/supplier-payments`, data);
  }

  // ── Supplier Reports (cross-supplier) ──────────────────
  getSupplierBalances(params?: any) {
    return this.http.get<any>(`${this.suppliersUrl}/reports/balances`, { params }).pipe(map((res) => res.data));
  }

  getOutstandingSuppliers(params?: any) {
    return this.http.get<any>(`${this.suppliersUrl}/reports/outstanding`, { params }).pipe(map((res) => res.data));
  }

  getSupplierPurchaseReport(params?: any) {
    return this.http.get<any>(`${this.suppliersUrl}/reports/purchases`, { params }).pipe(map((res) => res.data));
  }

  getSupplierPaymentReport(params?: any) {
    return this.http.get<any>(`${this.suppliersUrl}/reports/payments`, { params });
  }

  // ── Supplier intelligence (per product type, for the Supply screen) ────
  getSupplierIntelligence(productType: 'RAW_MATERIAL' | 'PACKAGING' | 'READY_PRODUCT') {
    return this.http
      .get<any>(`${API_BASE}/stock/supplier-intelligence`, { params: { product_type: productType } })
      .pipe(map((res) => res.data));
  }

  // ── Supplies ──────────────────────────────────────────
  getSupplies(params: any) {
    return this.http.get<any>(this.suppliesUrl, { params }).pipe(retry(2));
  }

  getSupplyById(id: number) {
    return this.http.get<any>(`${this.suppliesUrl}/show/${id}`).pipe(retry(2));
  }

  createSupply(data: CreateSupplyRequest) {
    return this.http.post<any>(`${this.suppliesUrl}/create`, data);
  }

  updateSupply(id: number, data: UpdateSupplyRequest) {
    return this.http.put<any>(`${this.suppliesUrl}/update/${id}`, data);
  }

  deleteSupply(id: number) {
    return this.http.delete<any>(`${this.suppliesUrl}/destroy/${id}`);
  }

  /** Cancel a purchase invoice — reverses the warehouse stock it added and refunds any supplier payment. Admin or branch manager only (route-gated). */
  cancelSupply(id: number) {
    return this.http.post<any>(`${this.suppliesUrl}/${id}/cancel`, {});
  }

  // ── Inventory ─────────────────────────────────────────
  getInventory(params: any) {
    return this.http.get<any>(this.inventoryUrl, { params }).pipe(retry(2));
  }

  transferGoods(data: TransferRequest) {
    return this.http.post<TransferResponse>(`${this.inventoryUrl}/transfer`, data);
  }

  // ── Manager Inventory (view only — see ManagerInventoryController) ──
  private managerInventoryUrl = `${API_BASE}/manager/inventory`;

  getManagerInventory(params?: any) {
    return this.http.get<any>(this.managerInventoryUrl, { params }).pipe(retry(2));
  }

  /** Per-product receiving history for the manager's own branch — how much was ever sent, what's left, and each shipment's date/quantity. */
  getManagerProductHistory(productId: number) {
    return this.http.get<any>(`${this.managerInventoryUrl}/${productId}/history`).pipe(map((res) => res.data));
  }

  // ── Shops (for dropdowns) ─────────────────────────────
  getActiveShops() {
    return this.http
      .get<any>(`${this.shopsUrl}`, { params: { status: 'active', per_page: 100 } })
      .pipe(
        retry(2),
        map((res) => (res.data || []) as { id: number; name: string }[])
      );
  }

  // ── Suppliers (for dropdowns) ─────────────────────────
  getAllSuppliers() {
    return this.http
      .get<any>(this.suppliersUrl, { params: { per_page: 100 } })
      .pipe(
        retry(2),
        map((res) => (res.data || []) as Supplier[])
      );
  }
}
