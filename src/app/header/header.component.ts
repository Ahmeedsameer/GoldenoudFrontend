import { Component, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserDropdownComponent } from '../shared/components/header/user-dropdown/user-dropdown.component';
import { NotificationDropdownComponent } from '../shared/components/header/notification-dropdown/notification-dropdown.component';
import { SidebarService } from '../shared/services/sidebar.service';
import { AuthService } from '../services/auth.service';
import { CompanySettingsService } from '../services/company-settings.service';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule,
    RouterModule,
    NotificationDropdownComponent,
    UserDropdownComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class AppHeaderComponent {
  readonly isMobileOpen$;
  private authService = inject(AuthService);
  companySettings = inject(CompanySettingsService);
  company$ = this.companySettings.settings$;

  constructor(public sidebarService: SidebarService) {
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
  }

  handleToggle() {
    if (window.innerWidth >= 1280) {
      this.sidebarService.toggleExpanded();
    } else {
      this.sidebarService.toggleMobileOpen();
    }
  }

  logOut() {
    this.authService.logout();
  }
}
