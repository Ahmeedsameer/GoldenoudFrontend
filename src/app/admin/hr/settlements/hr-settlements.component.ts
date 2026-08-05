import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HrService } from '../../../services/hr.service';
import { ListManager } from '../../../services/list-manager';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';
import { SearchBarComponent } from '../../../shared/components/common/search-bar/search-bar.component';

/**
 * Final Settlement documents — every row is an immutable snapshot created
 * once by EmployeeService::endEmployment() (see SettlementController).
 * This page only ever displays what was saved; it never recalculates.
 */
@Component({
  selector: 'app-hr-settlements',
  imports: [CommonModule, PaginationComponent, LoadingComponent, ModalComponent, DatePickerComponent, SearchBarComponent],
  templateUrl: './hr-settlements.component.html',
})
export class HrSettlementsComponent implements OnInit {
  private hr = inject(HrService);

  list = new ListManager<any>((params) => this.hr.getSettlements(params));

  statusFilter = '';
  dateFrom = '';
  dateTo = '';

  showDetail = false;
  detail: any = null;
  detailLoading = false;

  ngOnInit(): void {
    this.list.load();
  }

  setSearch(value: string) { this.list.setFilter('search', value || undefined); }
  setStatusFilter(value: string) {
    this.statusFilter = value;
    this.list.setFilter('employment_status', value || undefined);
  }
  setDateFrom(value: string) { this.dateFrom = value; this.list.setFilter('date_from', value || undefined); }
  setDateTo(value: string) { this.dateTo = value; this.list.setFilter('date_to', value || undefined); }

  employmentStatusLabel(status: string): string {
    return { resigned: 'استقالة', terminated: 'إنهاء خدمة' }[status] || status;
  }

  openDetail(row: any) {
    this.showDetail = true;
    this.detail = null;
    this.detailLoading = true;
    this.hr.getSettlement(row.id).subscribe({
      next: (d) => { this.detail = d; this.detailLoading = false; },
      error: () => { this.detailLoading = false; },
    });
  }
}
