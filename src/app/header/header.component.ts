import { Component, ElementRef, inject, ViewChild } from '@angular/core';

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
  isApplicationMenuOpen = false;
  readonly isMobileOpen$;
  private authService = inject(AuthService);
  companySettings = inject(CompanySettingsService);
  company$ = this.companySettings.settings$;

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

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

  toggleApplicationMenu() {
    this.isApplicationMenuOpen = !this.isApplicationMenuOpen;
  }

  ngAfterViewInit() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
    }
  };

  logOut() {
    this.authService.logout();
  }
}
