import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListManager } from '../../../services/list-manager';
import { HrService } from '../../../services/hr.service';
import { AuthService } from '../../../services/auth.service';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { LoadingComponent } from '../../../loading/loading.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';

@Component({
  selector: 'app-hr-leaves',
  imports: [CommonModule, PaginationComponent, LoadingComponent, DatePickerComponent],
  templateUrl: './hr-leaves.component.html',
})
export class HrLeavesComponent implements OnInit {
  private hr = inject(HrService);
  private auth = inject(AuthService);

  list = new ListManager<any>((params) => this.hr.getLeaves(params));
  busyId: number | null = null;
  activeStatus = '';
  myRole = this.auth.getUserRole();

  /** Every "pending" leave request needs the admin's action — shown as a count badge on the tab itself. */
  pendingCount = 0;

  statusTabs = [
    { value: '', label: 'الكل' },
    { value: 'pending', label: 'قيد المراجعة' },
    { value: 'approved', label: 'مقبولة' },
    { value: 'rejected', label: 'مرفوضة' },
    { value: 'cancelled', label: 'ملغاة' },
  ];

  statusMeta: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
    approved:  { label: 'مقبولة',       cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' },
    rejected:  { label: 'مرفوضة',       cls: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' },
    cancelled: { label: 'ملغاة',        cls: 'bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-gray-400' },
  };

  // ── End-early modal ─────────────────────────────
  showEndEarly = false;
  endEarlyLeave: any = null;
  endEarlyDate = '';
  endEarlyError = '';

  ngOnInit(): void {
    this.list.setLimitAndReload(20);
    this.loadPendingCount();
  }

  private loadPendingCount(): void {
    this.hr.getLeaves({ status: 'pending', per_page: 1 }).subscribe({
      next: (res) => { this.pendingCount = res?.data?.total ?? res?.total ?? 0; },
    });
  }

  setStatus(v: string) { this.activeStatus = v; this.list.setFilter('status', v || undefined); }

  approve(l: any) {
    this.busyId = l.id;
    this.hr.approveLeave(l.id).subscribe({
      next: () => { this.busyId = null; this.list.load(); this.loadPendingCount(); },
      error: (e) => { this.busyId = null; alert(e?.error?.message || 'تعذّر'); },
    });
  }

  reject(l: any) {
    const note = prompt('سبب الرفض (اختياري):') ?? undefined;
    this.busyId = l.id;
    this.hr.rejectLeave(l.id, note).subscribe({
      next: () => { this.busyId = null; this.list.load(); this.loadPendingCount(); },
      error: (e) => { this.busyId = null; alert(e?.error?.message || 'تعذّر'); },
    });
  }

  /** Managers cannot end another manager's leave — only Admin can; managers are also
   *  restricted to their own branch (enforced server-side, hidden here as a UX hint). */
  canEndEarly(l: any): boolean {
    if (l.status !== 'approved') return false;
    if (this.myRole === 'admin') return true;
    if (this.myRole === 'manager') return l.user?.role !== 'manager';
    return false;
  }

  openEndEarly(l: any) {
    this.endEarlyLeave = l;
    this.endEarlyDate = l.start_date;
    this.endEarlyError = '';
    this.showEndEarly = true;
  }

  confirmEndEarly() {
    if (!this.endEarlyDate) { this.endEarlyError = 'حدد تاريخ الإنهاء'; return; }
    this.busyId = this.endEarlyLeave.id;
    this.hr.endLeaveEarly(this.endEarlyLeave.id, this.endEarlyDate).subscribe({
      next: () => { this.busyId = null; this.showEndEarly = false; this.list.load(); },
      error: (e) => { this.busyId = null; this.endEarlyError = e?.error?.message || 'تعذّر إنهاء الإجازة'; },
    });
  }
}
