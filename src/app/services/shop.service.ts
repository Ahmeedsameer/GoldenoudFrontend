import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, retry } from 'rxjs';

const API_BASE = 'http://127.0.0.1:8000/api';

@Injectable({
  providedIn: 'root',
})
export class ShopService {
  private httpClient: HttpClient = inject(HttpClient);
  private apiUrl = `${API_BASE}/shops`;
  private userSearchUrl = `${API_BASE}/user-managment/search`;

  getShops(params: any) {
    return this.httpClient.get<any>(`${this.apiUrl}`, { params }).pipe(retry(2));
  }

  createShop(data: any) {
    return this.httpClient.post<any>(`${this.apiUrl}/create`, data);
  }

  getShopById(id: number) {
    return this.httpClient.get<any>(`${this.apiUrl}/show/${id}`).pipe(retry(2));
  }

  updateShop(id: number, data: any) {
    return this.httpClient.put<any>(`${this.apiUrl}/update/${id}`, data);
  }

  deleteShop(id: number) {
    return this.httpClient.delete<any>(`${this.apiUrl}/destroy/${id}`);
  }

  checkUsername(username: string) {
    return this.httpClient.get<{ exists: boolean }>(`${this.apiUrl}/check-username/${username}`);
  }

  assignManager(shopId: number, userId: number) {
    return this.httpClient.post<any>(`${this.apiUrl}/${shopId}/manager/assign`, { user_id: userId });
  }

  removeManager(shopId: number) {
    return this.httpClient.delete<any>(`${this.apiUrl}/${shopId}/manager/remove`);
  }

  getEmployees(shopId: number, params: any) {
    // Backend response is double-wrapped: { message, data: { data: [...], current_page, ... } }
    // Unwrap the outer envelope so the consumer receives the standard Laravel paginated shape
    // expected by extractPagination().
    return this.httpClient
      .get<any>(`${this.apiUrl}/${shopId}/employees`, { params })
      .pipe(retry(2), map((res) => res?.data ?? res));
  }

  addEmployee(shopId: number, userId: number) {
    return this.httpClient.post<any>(`${this.apiUrl}/${shopId}/employees/add`, { user_id: userId });
  }

  removeEmployee(shopId: number, userId: number) {
    return this.httpClient.delete<any>(`${this.apiUrl}/${shopId}/employees/${userId}`);
  }

  searchUsers(q: string, role: string = 'manager') {
    return this.httpClient.get<{ data: any[] }>(`${this.userSearchUrl}`, {
      params: { q, role, limit: 10 },
    });
  }
}
