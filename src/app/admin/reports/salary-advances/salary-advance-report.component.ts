import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportKpiCardComponent } from '../../../shared/components/reports/report-kpi-card/report-kpi-card.component';
import { ReportLoadingSkeletonComponent } from '../../../shared/components/reports/report-loading-skeleton/report-loading-skeleton.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import { SalaryAdvanceReportService, AdvanceReportRow, AdvanceReportFilters } from '../../../services/salary-advance-report.service';
import { ShopService } from '../../../services/shop.service';
import { SafeService } from '../../../services/safe.service';
import { HrService } from '../../../services/hr.service';
import { UserManagmentService } from '../../../services/user-managment.service';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد المراجعة', active: 'نشطة', rejected: 'مرفوضة', completed: 'مكتملة', cancelled: 'ملغاة',
};

/**
 * Phase 6.3 — dedicated Salary Advance report. Reuses the exact same
 * ReportExportService/report-toolbar infrastructure as every other report —
 * just a richer filter set (employee/branch/paying+receiving safe/status/
 * creator/search) than a generic tab shape would support.
 */
@Component({
  selector: 'app-salary-advance-report',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './salary-advance-report.component.html',
})
export class SalaryAdvanceReportComponent implements OnInit {
  private svc = inject(SalaryAdvanceReportService);
  private shopSvc = inject(ShopService);
  private safeSvc = inject(SafeService);
  private hr = inject(HrService);
  private userSvc = inject(UserManagmentService);

  loading = false;
  errorMsg = '';
  rows: AdvanceReportRow[] = [];

  from = '';
  to = '';
  userId: number | null = null;
  shopId: number | null = null;
  payingSafeId: number | null = null;
  receivingSafeId: number | null = null;
  status = '';
  creatorId: number | null = null;
  search = '';

  shops: { id: number; name: string }[] = [];
  employees: { id: number; name: string }[] = [];
  safes: any[] = [];
  admins: { id: number; name: string }[] = [];

  statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

  get filters(): AdvanceReportFilters {
    return {
      from: this.from || undefined, to: this.to || undefined,
      user_id: this.userId ?? undefined, shop_id: this.shopId ?? undefined,
      paying_safe_id: this.payingSafeId ?? undefined, receiving_safe_id: this.receivingSafeId ?? undefined,
      status: this.status || undefined, creator_id: this.creatorId ?? undefined,
      search: this.search || undefined,
    };
  }

  get exportParams(): Record<string, any> { return this.filters; }

  get totalAmount(): number { return this.rows.reduce((sum, r) => sum + (r.amount || 0), 0); }
  get totalRemaining(): number { return this.rows.reduce((sum, r) => sum + (r.remaining_balance || 0), 0); }

  ngOnInit(): void {
    this.shopSvc.getShops({ per_page: 200 }).subscribe({ next: (res) => { this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });
    this.hr.getEmployees({ per_page: 200 }).subscribe({ next: (res) => { this.employees = (res.data?.data || res.data || []).map((e: any) => ({ id: e.id, name: e.name })); } });
    this.safeSvc.getSafes().subscribe({ next: (res) => { this.safes = res.data || []; } });
    this.userSvc.getUsers({ limit: 200 }).subscribe({ next: (res) => { this.admins = (res.data || []).map((u: any) => ({ id: u.id, name: u.name })); } });
    this.load();
  }

  safeLabel(safe: any): string {
    const location = safe.shop ? safe.shop.name : 'الشركة';
    return `${safe.safe_type?.name || 'خزنة'} — ${location}`;
  }

  applyFilters(): void { this.load(); }
  clearRange(): void { this.from = ''; this.to = ''; this.applyFilters(); }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.svc.data(this.filters).subscribe({
      next: (rows) => { this.rows = rows; this.loading = false; },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل تقرير سلف الرواتب'; },
    });
  }

  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }
}
