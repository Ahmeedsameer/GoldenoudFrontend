import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListManager } from '../../../services/list-manager';
import { HrService } from '../../../services/hr.service';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { LoadingComponent } from '../../../loading/loading.component';

@Component({
  selector: 'app-hr-leaves',
  imports: [CommonModule, PaginationComponent, LoadingComponent],
  templateUrl: './hr-leaves.component.html',
})
export class HrLeavesComponent implements OnInit {
  private hr = inject(HrService);

  list = new ListManager<any>((params) => this.hr.getLeaves(params));
  busyId: number | null = null;
  activeStatus = '';

  statusTabs = [
    { value: '', label: 'الكل' },
    { value: 'pending', label: 'قيد المراجعة' },
    { value: 'approved', label: 'مقبولة' },
    { value: 'rejected', label: 'مرفوضة' },
  ];

  statusMeta: Record<string, { label: string; cls: string }> = {
    pending:  { label: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
    approved: { label: 'مقبولة',       cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' },
    rejected: { label: 'مرفوضة',       cls: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' },
  };

  ngOnInit(): void { this.list.setLimitAndReload(20); }

  setStatus(v: string) { this.activeStatus = v; this.list.setFilter('status', v || undefined); }

  approve(l: any) {
    this.busyId = l.id;
    this.hr.approveLeave(l.id).subscribe({
      next: () => { this.busyId = null; this.list.load(); },
      error: (e) => { this.busyId = null; alert(e?.error?.message || 'تعذّر'); },
    });
  }

  reject(l: any) {
    const note = prompt('سبب الرفض (اختياري):') ?? undefined;
    this.busyId = l.id;
    this.hr.rejectLeave(l.id, note).subscribe({
      next: () => { this.busyId = null; this.list.load(); },
      error: (e) => { this.busyId = null; alert(e?.error?.message || 'تعذّر'); },
    });
  }
}
