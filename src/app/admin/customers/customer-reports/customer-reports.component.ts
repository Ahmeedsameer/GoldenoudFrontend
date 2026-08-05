import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { CustomerService } from '../../../services/customer.service';
import { ReportsService } from '../../../services/reports.service';
import { AdminSalesReportService, ReportPeriod } from '../../../services/admin-sales-report.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import { SearchBarComponent } from '../../../shared/components/common/search-bar/search-bar.component';

/**
 * Customer Reports — the 4 reports requested:
 *  1. Top Customers    — reuses the EXISTING admin/manager "top customers"
 *     report endpoints (AdminSalesReportService / ReportsService) instead of
 *     adding a third backend implementation.
 *  2. New Customers     — CustomerController::newCustomers()
 *  3. Inactive Customers — CustomerController::inactiveCustomers()
 *  4. Customer Purchase History — search reuses the same customer search as
 *     the Customers list; selecting a customer opens their existing Detail
 *     page (already shows invoice history/total/average/count) instead of
 *     re-implementing the same view here.
 */
@Component({
  selector: 'app-customer-reports',
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, DatePickerComponent, SearchBarComponent],
  templateUrl: './customer-reports.component.html',
})
export class CustomerReportsComponent implements OnInit {
  private auth = inject(AuthService);
  private customerService = inject(CustomerService);
  private reportsService = inject(ReportsService);
  private adminReportsService = inject(AdminSalesReportService);

  tab: 'top' | 'new' | 'inactive' | 'history' = 'top';
  isAdmin = this.auth.isAdmin();

  // ── Top Customers ────────────────────────────────
  topLoading = false;
  topPeriod: ReportPeriod = 'month';
  topCustomers: any[] = [];

  // ── New Customers ────────────────────────────────
  newLoading = false;
  newDateFrom = '';
  newDateTo = '';
  newCustomers: any[] = [];
  newTotal = 0;

  // ── Inactive Customers ───────────────────────────
  inactiveLoading = false;
  inactiveDays = 30;
  inactiveCustomers: any[] = [];
  inactiveTotal = 0;

  // ── Customer Purchase History (search → link to detail) ─────────
  historySearch = '';
  historyLoading = false;
  historyResults: any[] = [];

  ngOnInit(): void {
    this.loadTopCustomers();
  }

  setTab(tab: 'top' | 'new' | 'inactive' | 'history') {
    this.tab = tab;
    if (tab === 'top' && this.topCustomers.length === 0) this.loadTopCustomers();
  }

  loadTopCustomers() {
    this.topLoading = true;
    const req$: Observable<any> = this.isAdmin
      ? this.adminReportsService.getCustomers(this.topPeriod)
      : this.reportsService.getTopCustomers(this.topPeriod);
    req$.subscribe({
      next: (res: any) => {
        this.topCustomers = res?.top_customers ?? [];
        this.topLoading = false;
      },
      error: () => { this.topLoading = false; },
    });
  }

  loadNewCustomers() {
    this.newLoading = true;
    this.customerService.getNewCustomers({ date_from: this.newDateFrom || undefined, date_to: this.newDateTo || undefined, per_page: 50 }).subscribe({
      next: (res) => {
        const data = res?.data;
        this.newCustomers = data?.data ?? [];
        this.newTotal = data?.total ?? this.newCustomers.length;
        this.newLoading = false;
      },
      error: () => { this.newLoading = false; },
    });
  }

  loadInactiveCustomers() {
    this.inactiveLoading = true;
    this.customerService.getInactiveCustomers({ days: this.inactiveDays, per_page: 50 }).subscribe({
      next: (res) => {
        const data = res?.data;
        this.inactiveCustomers = data?.customers?.data ?? [];
        this.inactiveTotal = data?.customers?.total ?? this.inactiveCustomers.length;
        this.inactiveLoading = false;
      },
      error: () => { this.inactiveLoading = false; },
    });
  }

  searchHistory(term: string) {
    this.historySearch = term;
    if (!term || term.trim().length < 2) { this.historyResults = []; return; }
    this.historyLoading = true;
    this.customerService.getCustomers({ search: term, per_page: 10 }).subscribe({
      next: (res) => {
        this.historyResults = res?.data ?? [];
        this.historyLoading = false;
      },
      error: () => { this.historyLoading = false; },
    });
  }
}
