import { Component, inject, OnInit } from '@angular/core';
import { PaginationComponent } from "../../../pagination/pagination.component";
import { UserManagmentService } from '../../../services/user-managment.service';

import { BadgeComponent } from "../../../shared/components/ui/badge/badge.component";

import { CommonModule } from '@angular/common';
import { UserRolePip } from '../../../pips/user-role.pip';
import { RouterLink } from "@angular/router";
import { ListManager } from '../../../services/list-manager';

/**
 * Admin accounts only — the backend (UsersManagmentController::index) always
 * scopes this list to role=admin. Every other role (manager, sales) is
 * managed separately under HR > الموظفون.
 */
@Component({
  selector: 'app-users-table',
  imports: [UserRolePip, PaginationComponent, BadgeComponent, CommonModule, RouterLink],
  templateUrl: './users-table.component.html',
  styleUrl: './users-table.component.css',
})
export class UsersTableComponent implements OnInit {
  userManagmentService: UserManagmentService = inject(UserManagmentService);
  list = new ListManager<any>((params) => this.userManagmentService.getUsers(params));

  ngOnInit(): void {
    this.list.load();
  }

  setNameFilter(name: string) {
    this.list.setFilter('name', name);
  }
}
