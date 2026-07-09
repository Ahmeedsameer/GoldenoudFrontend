import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../enviroment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = environment.apiUrl.notifications;

  getNotifications(params?: { per_page?: number; page?: number }): Observable<any> {
    return this.http.get<any>(this.base, { params: params as any });
  }

  unreadCount(): Observable<any> {
    return this.http.get<any>(`${this.base}/unread-count`);
  }

  markRead(id: number): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.put<any>(`${this.base}/read-all`, {});
  }

  sendTest(): Observable<any> {
    return this.http.post<any>(`${this.base}/test`, {});
  }

  // ── Web Push (VAPID) ────────────────────────────────────────────────────────

  getVapidKey(): Observable<any> {
    return this.http.get<any>(`${this.base}/vapid-key`);
  }

  subscribe(body: { endpoint: string; keys: { p256dh: string; auth: string } }): Observable<any> {
    return this.http.post<any>(`${this.base}/subscribe`, body);
  }

  unsubscribe(endpoint: string): Observable<any> {
    return this.http.post<any>(`${this.base}/unsubscribe`, { endpoint });
  }
}
