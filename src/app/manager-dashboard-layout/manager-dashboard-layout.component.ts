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
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      name: 'الخزنة',
      subItems: [
        { name: 'خزنة الفرع', path: '/dashboard/safe/my-shop' },
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
