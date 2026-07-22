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
import { TransferInvoiceReportService, InvoiceReportRow, InvoiceReportFilters } from '../../../services/transfer-invoice-report.service';
import { ShopService } from '../../../services/shop.service';
import { UserManagmentService } from '../../../services/user-managment.service';

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة', submitted: 'بانتظار الموافقة', approved: 'تمت الموافقة', rejected: 'مرفوض',
  preparing: 'قيد التجهيز', shipped: 'تم الشحن', received: 'تم الاستلام', closed: 'مغلق',
};

/**
 * Phase 5.8 — dedicated Internal Transfer Invoice report. Reuses the exact
 * same TransferReportController/ReportExportService infrastructure as every
 * other transfer report — just a richer filter set (source/destination/type/
 * status/creator/approver/receiver/search) than the generic tab shape supports.
 */
@Component({
  selector: 'app-transfer-invoice-report',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, ReportKpiCardComponent, ReportLoadingSkeletonComponent, ReportEmptyStateComponent, ReportToolbarComponent, DatePickerComponent],
  templateUrl: './transfer-invoice-report.component.html',
})
export class TransferInvoiceReportComponent implements OnInit {
  private svc = inject(TransferInvoiceReportService);
  private shopSvc = inject(ShopService);
  private userSvc = inject(UserManagmentService);

  loading = false;
  errorMsg = '';
  rows: InvoiceReportRow[] = [];

  from = '';
  to = '';
  sourceShopId: number | null = null;
  destinationShopId: number | null = null;
  transferType = '';
  status = '';
  creatorId: number | null = null;
  approverId: number | null = null;
  receiverId: number | null = null;
  search = '';

  shops: { id: number; name: string }[] = [];
  users: { id: number; name: string }[] = [];

  statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

  get filters(): InvoiceReportFilters {
    return {
      from: this.from || undefined, to: this.to || undefined,
      source_shop_id: this.sourceShopId ?? undefined, destination_shop_id: this.destinationShopId ?? undefined,
      transfer_type: this.transferType || undefined, status: this.status || undefined,
      creator_id: this.creatorId ?? undefined, approver_id: this.approverId ?? undefined, receiver_id: this.receiverId ?? undefined,
      search: this.search || undefined,
    };
  }

  get exportParams(): Record<string, any> { return this.filters; }

  get totalValue(): number { return this.rows.reduce((sum, r) => sum + (r.reference_value || 0), 0); }

  ngOnInit(): void {
    this.shopSvc.getShops({ per_page: 200 }).subscribe({ next: (res) => { this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); } });
    this.userSvc.getUsers({ limit: 200 }).subscribe({ next: (res) => { this.users = (res.data || []).map((u: any) => ({ id: u.id, name: u.name })); } });
    this.load();
  }

  applyFilters(): void { this.load(); }
  clearRange(): void { this.from = ''; this.to = ''; this.applyFilters(); }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    this.svc.data(this.filters).subscribe({
      next: (rows) => { this.rows = rows; this.loading = false; },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل تقرير فواتير النقل الداخلية'; },
    });
  }

  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }
}
