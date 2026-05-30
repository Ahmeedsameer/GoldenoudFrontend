import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, retry } from 'rxjs';
import {
  CreateSupplyRequest,
  Goods,
  Supplier,
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

  createSupplier(data: { name: string; phone: string }) {
    return this.http.post<any>(`${this.suppliersUrl}/create`, data);
  }

  updateSupplier(id: number, data: { name?: string; phone?: string }) {
    return this.http.put<any>(`${this.suppliersUrl}/update/${id}`, data);
  }

  deleteSupplier(id: number) {
    return this.http.delete<any>(`${this.suppliersUrl}/destroy/${id}`);
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

  // ── Inventory ─────────────────────────────────────────
  getInventory(params: any) {
    return this.http.get<any>(this.inventoryUrl, { params }).pipe(retry(2));
  }

  transferGoods(data: TransferRequest) {
    return this.http.post<TransferResponse>(`${this.inventoryUrl}/transfer`, data);
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
