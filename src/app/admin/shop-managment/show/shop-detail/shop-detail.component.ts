import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';
import { BadgeComponent } from '../../../../shared/components/ui/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { PaginationComponent } from '../../../../pagination/pagination.component';
import { ShopService } from '../../../../services/shop.service';
import { extractPagination, PaginationResult } from '../../../../services/pagination-helper.service';
import { ShopStockComponent } from '../../../../admin/stock-managment/inventory/shop-stock/shop-stock.component';

type ActiveTab = 'info' | 'manager' | 'employees' | 'stock';

@Component({
  selector: 'app-shop-detail',
  imports: [
    CommonModule,
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    LoadingComponent,
    ModalComponent,
    PaginationComponent,
    ShopStockComponent,
  ],
  templateUrl: './shop-detail.component.html',
  styleUrl: './shop-detail.component.css',
})
export class ShopDetailComponent implements OnInit, OnDestroy {
  private shopService = inject(ShopService);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  shopId!: number;
  shop: any = null;
  loading = false;
  activeTab: ActiveTab = 'info';

  // ── Employees ──────────────────────────────────────────
  employeesResult: PaginationResult<any> = { data: [], links: [], currentPage: 1, totalPages: 1 };
  employeesLoading = false;
  employeesLoaded = false;

  showRemoveEmployeeModal = false;
  employeeToRemove: number | null = null;
  removeEmployeeLoading = false;

  showAddEmployeeModal = false;
  employeeSearch = '';
  employeeResults: any[] = [];
  employeeSearchLoading = false;
  private employeeSearch$ = new Subject<string>();

  // ── Manager ────────────────────────────────────────────
  showAssignManagerModal = false;
  showRemoveManagerModal = false;
  managerSearch = '';
  managerResults: any[] = [];
  managerSearchLoading = false;
  managerAssignLoading = false;
  selectedManagerForAssign: any = null;
  private managerSearch$ = new Subject<string>();

  ngOnInit(): void {
    this.shopId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadShop();

    // Employee search stream
    this.employeeSearch$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
        switchMap((q) => {
          if (!q || q.length < 2) {
            this.employeeResults = [];
            return of({ data: [] });
          }
          this.employeeSearchLoading = true;
          return this.shopService.searchUsers(q, 'employee');
        })
      )
      .subscribe({
        next: (res) => {
          this.employeeSearchLoading = false;
          this.employeeResults = res.data || [];
        },
        error: () => {
          this.employeeSearchLoading = false;
        },
      });

    // Manager search stream
    this.managerSearch$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
        switchMap((q) => {
          if (!q || q.length < 2) {
            this.managerResults = [];
            return of({ data: [] });
          }
          this.managerSearchLoading = true;
          return this.shopService.searchUsers(q, 'manager');
        })
      )
      .subscribe({
        next: (res) => {
          this.managerSearchLoading = false;
          this.managerResults = res.data || [];
        },
        error: () => {
          this.managerSearchLoading = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadShop() {
    this.loading = true;
    this.shopService.getShopById(this.shopId).subscribe({
      next: (res) => {
        this.shop = res.data || res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  setTab(tab: ActiveTab) {
    this.activeTab = tab;
    if (tab === 'employees' && !this.employeesLoaded) {
      this.loadEmployees();
    }
  }

  // ── Employees ──────────────────────────────────────────

  loadEmployees(page: number = 1) {
    if (!this.shopId) {
      console.error('loadEmployees called without a valid shopId');
      return;
    }
    this.employeesLoading = true;
    this.shopService.getEmployees(this.shopId, { page, per_page: 20 }).subscribe({
      next: (res) => {
        this.employeesResult = extractPagination(res);
        this.employeesLoading = false;
        this.employeesLoaded = true;
      },
      error: (err) => {
        console.error('Failed to load employees:', err);
        this.employeesLoading = false;
      },
    });
  }

  confirmRemoveEmployee(userId: number) {
    this.employeeToRemove = userId;
    this.showRemoveEmployeeModal = true;
  }

  doRemoveEmployee() {
    if (!this.employeeToRemove) return;
    this.removeEmployeeLoading = true;
    this.shopService.removeEmployee(this.shopId, this.employeeToRemove).subscribe({
      next: () => {
        this.showRemoveEmployeeModal = false;
        this.employeeToRemove = null;
        this.removeEmployeeLoading = false;
        this.loadEmployees(this.employeesResult.currentPage);
        this.loadShop();
      },
      error: (err) => {
        console.error('Failed to remove employee:', err);
        this.removeEmployeeLoading = false;
      },
    });
  }

  onEmployeeSearchChange(q: string) {
    this.employeeSearch = q;
    this.employeeSearch$.next(q);
  }

  addEmployeeError: string | null = null;

  addEmployee(userId: number) {
    this.addEmployeeError = null;
    this.shopService.addEmployee(this.shopId, userId).subscribe({
      next: () => {
        this.showAddEmployeeModal = false;
        this.employeeSearch = '';
        this.employeeResults = [];
        this.loadEmployees(1);
        this.loadShop();
      },
      error: (err) => {
        console.error('Failed to add employee:', err);
        this.addEmployeeError = err?.error?.message || 'تعذر إضافة الموظف.';
      },
    });
  }

  openAddEmployeeModal() {
    this.employeeSearch = '';
    this.employeeResults = [];
    this.addEmployeeError = null;
    this.showAddEmployeeModal = true;
  }

  // ── Manager ────────────────────────────────────────────

  openAssignManagerModal() {
    this.managerSearch = '';
    this.managerResults = [];
    this.selectedManagerForAssign = null;
    this.showAssignManagerModal = true;
  }

  onManagerSearchChange(q: string) {
    this.managerSearch = q;
    this.managerSearch$.next(q);
  }

  selectManagerForAssign(manager: any) {
    this.selectedManagerForAssign = manager;
  }

  doAssignManager() {
    if (!this.selectedManagerForAssign) return;
    this.managerAssignLoading = true;
    this.shopService.assignManager(this.shopId, this.selectedManagerForAssign.id).subscribe({
      next: () => {
        this.showAssignManagerModal = false;
        this.selectedManagerForAssign = null;
        this.managerSearch = '';
        this.managerResults = [];
        this.managerAssignLoading = false;
        this.loadShop();
      },
      error: () => {
        this.managerAssignLoading = false;
      },
    });
  }

  doRemoveManager() {
    this.shopService.removeManager(this.shopId).subscribe({
      next: () => {
        this.showRemoveManagerModal = false;
        this.loadShop();
      },
      error: () => {},
    });
  }

  formatShift(time: string): string {
    if (!time) return '--:--';
    return time.substring(0, 5);
  }
}
