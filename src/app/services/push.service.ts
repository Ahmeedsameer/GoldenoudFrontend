import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';

/**
 * Standard Web Push (VAPID) — no Firebase.
 *
 * After login:
 *   1. registers the service worker (/sw.js)
 *   2. requests notification permission
 *   3. subscribes to PushManager with the VAPID public key (fetched from Laravel)
 *   4. sends the subscription to the backend for storage
 *
 * Fully guarded: a no-op on unsupported browsers, and never throws.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private notificationService = inject(NotificationService);
  private initialised = false;

  get isSupported(): boolean {
    return typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;
  }

  async init(): Promise<void> {
    if (this.initialised) return;
    if (!this.isSupported) {
      console.warn('[Push] Web Push is not supported in this browser.');
      return;
    }
    this.initialised = true;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      console.info('[Push] Service worker registered.');

      const permission = await Notification.requestPermission();
      console.info('[Push] Notification permission:', permission);
      if (permission !== 'granted') return;

      const keyRes = await firstValueFrom(this.notificationService.getVapidKey());
      const publicKey = keyRes?.public_key;
      if (!publicKey) { console.warn('[Push] Server returned no VAPID public key.'); return; }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(publicKey) as BufferSource,
        });
        console.info('[Push] PushManager subscription created.');
      }

      const json: any = sub.toJSON();
      await firstValueFrom(this.notificationService.subscribe({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      }));
      console.info('[Push] Subscription stored on the server.');
    } catch (e) {
      console.error('[Push] init error:', e);
    }
  }

  /** Convert a base64url VAPID key into the Uint8Array PushManager expects. */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
    return output;
  }
}
