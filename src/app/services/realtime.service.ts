import { inject, Injectable } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { environment } from '../enviroment';
import { AuthService } from './auth.service';

/**
 * Real-time Notification Center updates via Laravel Broadcasting (Reverb).
 * No polling. Connects to the Reverb websocket server and listens on the
 * user's private channel.  No-op / silent if Reverb is unreachable.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private authService = inject(AuthService);
  private echo: any = null;

  /** Subscribe to the current user's private notifications channel. */
  listen(userId: number, onNotification: (payload: any) => void): void {
    if (this.echo) return;

    try {
      (window as any).Pusher = Pusher;

      this.echo = new Echo({
        broadcaster: 'reverb',
        key: environment.reverb.key,
        wsHost: environment.reverb.wsHost,
        wsPort: environment.reverb.wsPort,
        wssPort: environment.reverb.wsPort,
        forceTLS: environment.reverb.scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: `${environment.apiUrl.base}/broadcasting/auth`,
        auth: {
          headers: { Authorization: `Bearer ${this.authService.getAuthToken()}` },
        },
      });

      this.echo.private(`notifications.${userId}`)
        .listen('.notification.created', (payload: any) => onNotification(payload));

      console.info('[Realtime] Listening on notifications.' + userId);
    } catch (e) {
      console.error('[Realtime] Echo init error:', e);
    }
  }

  leave(userId: number): void {
    try {
      this.echo?.leave(`notifications.${userId}`);
      this.echo?.disconnect();
    } catch { /* ignore */ }
    this.echo = null;
  }
}
