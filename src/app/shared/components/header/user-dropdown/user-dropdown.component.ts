import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports: [CommonModule, RouterModule],
})
export class UserDropdownComponent {
  private authService = inject(AuthService);

  get userName(): string {
    return this.authService.getUser()?.name || 'المستخدم';
  }

  get userInitial(): string {
    return this.userName.charAt(0).toUpperCase();
  }

  /** Always the AUTHENTICATED user's own profile — never another user's.
   *  Admins manage accounts under Users, so their "own profile" is their own
   *  admin account record there. Managers/sellers use the self-service HR
   *  profile page (already scoped server-side to the logged-in employee). */
  get profileLink(): any[] {
    if (this.authService.isAdmin()) {
      return ['/dashboard/users/show', this.authService.getUser()?.id];
    }
    return ['/dashboard/my-profile'];
  }
}
