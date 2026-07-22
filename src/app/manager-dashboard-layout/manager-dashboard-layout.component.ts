import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppHeaderComponent } from '../header/header.component';
import { BackdropComponent } from '../backdrop/backdrop.component';
import { SidebarService } from '../shared/services/sidebar.service';
import { NavItem, SideBarComponent } from '../side-bar/side-bar.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-manager-dashboard-layout',
  imports: [
    CommonModule,
    RouterModule,
    AppHeaderComponent,
    SideBarComponent,
    BackdropComponent,
  ],
  templateUrl: './manager-dashboard-layout.component.html',
})
export class ManagerDashboardLayoutComponent {
  navItems: NavItem[] = [
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
      name: 'المبيعات',
      subItems: [
        { name: 'نقطة البيع (كاشير)', path: '/dashboard/cashier' },
        { name: 'الفواتير', path: '/dashboard/invoices' },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      name: 'طلبات الموافقة',
      subItems: [
        { name: 'طلبات الأسعار', path: '/dashboard/override-requests' },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
      name: 'التقارير',
      subItems: [
        { name: 'إحصائيات المبيعات', path: '/dashboard/reports' },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M17 7l4 4-4 4M3 11h18M7 21l-4-4 4-4"/></svg>`,
      name: 'عمليات الفروع',
      subItems: [
        { name: 'لوحة عمليات الفرع', path: '/dashboard/branch-operations/dashboard' },
        { name: 'طلبات النقل بين الفروع', path: '/dashboard/branch-operations/transfers' },
        { name: 'إدارة الهالك', path: '/dashboard/branch-operations/waste' },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 2v8m0 0v2m0-2c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      name: 'إدارة الأسعار',
      subItems: [
        { name: 'أسعار المنتجات', path: '/dashboard/pricing' },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
      name: 'المخزون',
      subItems: [
        { name: 'نقل المخزون', path: '/dashboard/inventory-transfer' },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      name: 'الخزنة',
      subItems: [
        { name: 'خزنة الفرع',     path: '/dashboard/safe/my-shop' },
        { name: 'مطابقة الخزنة', path: '/dashboard/reconciliation' },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m3-6h7a2 2 0 012 2v6a2 2 0 01-2 2h-7a2 2 0 01-2-2v-6a2 2 0 012-2zm5 5a1 1 0 11-2 0 1 1 0 012 0z"/></svg>`,
      name: 'إدارة العهدة',
      subItems: [
        { name: 'عهدة الفرع', path: '/dashboard/conventions' },
      ],
    },
    {
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor"><path d="M320 312C386.3 312 440 258.3 440 192C440 125.7 386.3 72 320 72C253.7 72 200 125.7 200 192C200 258.3 253.7 312 320 312zM290.3 368C191.8 368 112 447.8 112 546.3C112 562.7 125.3 576 141.7 576L498.3 576C514.7 576 528 562.7 528 546.3C528 447.8 448.2 368 349.7 368L290.3 368z"/></svg>`,
      name: 'ملفّي الوظيفي',
      subItems: [
        { name: 'نظرة عامة', path: '/dashboard/my-hr' },
        { name: 'ملفي الشخصي', path: '/dashboard/my-profile' },
        { name: 'جدولي الأسبوعي', path: '/dashboard/my-schedule' },
        { name: 'حضوري', path: '/dashboard/my-attendance' },
        { name: 'إجازاتي', path: '/dashboard/my-leave' },
        { name: 'مبيعاتي', path: '/dashboard/my-sales' },
        { name: 'سلفتي', path: '/dashboard/my-advances' },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 2v8m0 0v2m0-2c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      name: 'سلف موظفي الفرع',
      subItems: [
        { name: 'حالة طلبات السلف', path: '/dashboard/hr/advances' },
      ],
    },
  ];

  readonly isExpanded$;
  readonly isHovered$;
  readonly isMobileOpen$;

  private authService = inject(AuthService);

  constructor(public sidebarService: SidebarService) {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isHovered$ = this.sidebarService.isHovered$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
  }

  logOut() {
    this.authService.logout();
  }
}
