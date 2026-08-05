import { Component, inject, OnInit } from '@angular/core';
import { PaginationComponent } from "../../../pagination/pagination.component";
import { UserManagmentService } from '../../../services/user-managment.service';

import { BadgeComponent } from "../../../shared/components/ui/badge/badge.component";

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserRolePip } from '../../../pips/user-role.pip';
import { RouterLink } from "@angular/router";
import { ListManager } from '../../../services/list-manager';
import { SearchBarComponent } from '../../../shared/components/common/search-bar/search-bar.component';

/**
 * Admin accounts only — the backend (UsersManagmentController::index) always
 * scopes this list to role=admin. Every other role (manager, sales) is
 * managed separately under HR > الموظفون.
 */
@Component({
  selector: 'app-users-table',
  imports: [UserRolePip, PaginationComponent, BadgeComponent, CommonModule, FormsModule, RouterLink, SearchBarComponent],
  templateUrl: './users-table.component.html',
  styleUrl: './users-table.component.css',
})
export class UsersTableComponent implements OnInit {
  userManagmentService: UserManagmentService = inject(UserManagmentService);
  list = new ListManager<any>((params) => this.userManagmentService.getUsers(params));

  /** 'all' sends status=all (backend's index() only applies the where('status', ...)
   *  filter for 'active'/'inactive' — any other value, like 'all', is left unfiltered). */
  statusFilter: 'all' | 'active' | 'inactive' = 'active';

  /** Summary cards — counts are independent of the current filtered view (and of
   *  pagination), reusing the same getUsers() endpoint with per_page=1 to read the
   *  paginator's `total` without fetching full pages of rows. */
  activeCount = 0;
  inactiveCount = 0;

  ngOnInit(): void {
    this.list.setFilter('status', this.statusFilter);
    this.loadCounts();
  }

  setNameFilter(name: string) {
    this.list.setFilter('name', name);
  }

  setStatusFilter(value: 'all' | 'active' | 'inactive') {
    this.statusFilter = value;
    this.list.setFilter('status', value);
  }

  private loadCounts() {
    this.userManagmentService.getUsers({ status: 'active', per_page: 1 }).subscribe({
      next: (res: any) => { this.activeCount = res?.total ?? 0; },
      error: () => {},
    });
    this.userManagmentService.getUsers({ status: 'inactive', per_page: 1 }).subscribe({
      next: (res: any) => { this.inactiveCount = res?.total ?? 0; },
      error: () => {},
    });
  }

  /** Deactivate/reactivate — never a hard delete, flips users.status. Deactivating
   *  requires confirmation since it immediately blocks the account from logging in. */
  toggleStatus(user: any) {
    const activating = user.status === 'inactive';
    if (!activating) {
      const confirmed = confirm(`هل تريد إلغاء تفعيل حساب "${user.name}"؟ لن يتمكن من تسجيل الدخول بعد ذلك.`);
      if (!confirmed) return;
    }
    this.userManagmentService.toggleStatus(user.id).subscribe({
      next: () => { this.list.load(); this.loadCounts(); },
      error: (err) => {
        alert(err?.error?.message || err?.error?.errors?.status?.[0] || 'تعذّر تنفيذ العملية.');
      },
    });
  }
}
