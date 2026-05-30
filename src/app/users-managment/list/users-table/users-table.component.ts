import { Component, inject, OnInit } from '@angular/core';
import { PaginationComponent } from "../../../pagination/pagination.component";
import { UserManagmentService } from '../../../services/user-managment.service';

import { BadgeComponent } from "../../../shared/components/ui/badge/badge.component";

import { CommonModule } from '@angular/common';
import { Option, SelectComponent } from "../../../shared/components/form/select/select.component";
import { UserRolePip } from '../../../pips/user-role.pip';
import { RouterLink } from "@angular/router";
import { ListManager } from '../../../services/list-manager';

@Component({
  selector: 'app-users-table',
  imports: [UserRolePip, PaginationComponent, BadgeComponent, CommonModule, SelectComponent, RouterLink],
  templateUrl: './users-table.component.html',
  styleUrl: './users-table.component.css',
})
export class UsersTableComponent implements OnInit {
  userManagmentService: UserManagmentService = inject(UserManagmentService);
  list = new ListManager<any>((params) => this.userManagmentService.getUsers(params));

  userTypes: Option[] = [
    { value: '', label: 'الكل' },
    { value: 'admin', label: 'مدير موقع' },
    { value: 'supervisor', label: 'مشرف' },
    { value: 'accountant', label: 'محاسب' },
    { value: 'employee', label: 'موظف' },
  ]


  ngOnInit(): void {

    this.list.load();
  }





  setNameFilter(name: string) {
    this.list.setFilter('name', name);

  }

  setTypeFilter(type: string) {

    this.list.setFilter('role', type);

  }


}
