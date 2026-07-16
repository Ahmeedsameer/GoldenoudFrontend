import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { OverlayModule } from '@angular/cdk/overlay';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { NotificationService } from '../../../../services/notification.service';
import { PushService } from '../../../../services/push.service';
import { RealtimeService } from '../../../../services/realtime.service';
import { AuthService } from '../../../../services/auth.service';
import { AppNotification } from '../../../../models/convention.model';

@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  imports: [CommonModule, RouterModule, OverlayModule],
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private pushService = inject(PushService);
  private realtime = inject(RealtimeService);
  private authService = inject(AuthService);
  private router = inject(Router);

  isOpen = false;
  notifying = false;
  notifications: AppNotification[] = [];
  unreadCount = 0;
  loading = false;
  testing = false;

  /** CDK connected-overlay positions: drop below the bell, aligned to its edge,
   *  with fallbacks so it always stays inside the viewport (RTL + responsive).
   *  The overlay renders at the document root, so it is never clipped by the
   *  header's backdrop-filter/overflow. */
  overlayPositions: ConnectedPosition[] = [
    { originX: 'end',   originY: 'bottom', overlayX: 'end',   overlayY: 'top', offsetY: 10 },
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 10 },
    { originX: 'end',   originY: 'top',    overlayX: 'end',   overlayY: 'bottom', offsetY: -10 },
  ];

  private userId: number | null = null;

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) return;

    this.userId = this.authService.getUser()?.id ?? null;

    // Initial unread count
    this.refresh();

    // Register the service worker + Web Push subscription (standard VAPID).
    this.pushService.init();

    // Real-time Notification Center updates via Laravel Reverb (no polling).
    if (this.userId) {
      this.realtime.listen(this.userId, (payload) => this.onRealtimeNotification(payload));
    }
  }

  ngOnDestroy(): void {
    if (this.userId) this.realtime.leave(this.userId);
  }

  /** Instant update when a broadcast arrives. */
  private onRealtimeNotification(payload: any) {
    const n: AppNotification = payload?.notification;
    if (n && !this.notifications.find((x) => x.id === n.id)) {
      this.notifications.unshift(n);
    }
    this.unreadCount = payload?.unread_count ?? this.unreadCount + 1;
    this.notifying = this.unreadCount > 0;
  }

  refresh() {
    this.notificationService.unreadCount().subscribe({
      next: (res) => {
        this.unreadCount = res.unread_count || 0;
        this.notifying = this.unreadCount > 0;
      },
    });
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.load();
    }
  }

  closeDropdown() {
    this.isOpen = false;
  }

  load() {
    this.loading = true;
    this.notificationService.getNotifications({ per_page: 15 }).subscribe({
      next: (res) => {
        this.notifications = res.data?.data ?? [];
        this.unreadCount = res.unread_count || 0;
        this.notifying = this.unreadCount > 0;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  markRead(n: AppNotification) {
    if (!n.read_at) {
      this.notificationService.markRead(n.id).subscribe({
        next: () => {
          n.read_at = new Date().toISOString();
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.notifying = this.unreadCount > 0;
        },
      });
    }
    this.routeForNotification(n);
  }

  /** Smart deep-linking: every notification's `data.route` (set server-side, per
   *  recipient — e.g. an admin reviewing a leave request gets /dashboard/hr/leaves
   *  while the employee gets /dashboard/my-leave) always wins. A small type→route
   *  fallback table covers older notifications generated before deep links existed. */
  private static readonly TYPE_FALLBACK: Record<string, string> = {
    schedule: '/dashboard/my-schedule',
    leave: '/dashboard/my-leave',
    payroll: '/dashboard/my-profile',
    bonus: '/dashboard/my-profile',
    penalty: '/dashboard/my-profile',
    employee_transfer: '/dashboard/my-profile',
    employee: '/dashboard/my-profile',
    advance: '/dashboard/my-advances',
  };

  private routeForNotification(n: AppNotification) {
    const route = n.data?.route || NotificationDropdownComponent.TYPE_FALLBACK[n.type] || NotificationDropdownComponent.TYPE_FALLBACK[n.data?.type];
    if (route) {
      this.closeDropdown();
      this.router.navigate([route]);
    }
  }

  markAllRead() {
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.notifications.forEach((n) => (n.read_at = n.read_at || new Date().toISOString()));
        this.unreadCount = 0;
        this.notifying = false;
      },
    });
  }

  sendTest() {
    this.testing = true;
    this.notificationService.sendTest().subscribe({
      next: () => { this.testing = false; this.refresh(); if (this.isOpen) this.load(); },
      error: () => { this.testing = false; },
    });
  }
}
