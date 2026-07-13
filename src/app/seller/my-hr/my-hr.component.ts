import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../services/hr.service';
import { LoadingComponent } from '../../loading/loading.component';

@Component({
  selector: 'app-my-hr',
  imports: [CommonModule, FormsModule, LoadingComponent],
  templateUrl: './my-hr.component.html',
})
export class MyHrComponent implements OnInit {
  private hr = inject(HrService);

  loading = false;
  summary: any = null;

  leaves: any[] = [];
  leaveBalance: any = null;

  // leave request form
  submitting = false;
  leaveError = '';
  form = { start_date: '', end_date: '', type: 'annual', reason: '' };

  monthNames = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  leaveStatusMeta: Record<string, { label: string; cls: string }> = {
    pending:  { label: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
    approved: { label: 'مقبولة',       cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' },
    rejected: { label: 'مرفوضة',       cls: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' },
  };

  ngOnInit(): void { this.reload(); this.loadLeaves(); }

  reload() {
    this.loading = true;
    this.hr.mySummary().subscribe({
      next: (d) => { this.summary = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadLeaves() {
    this.hr.myLeaves().subscribe({
      next: (d) => { this.leaves = d?.requests?.data || d?.requests || []; this.leaveBalance = d?.balance; },
      error: () => {},
    });
  }

  submitLeave() {
    if (!this.form.start_date || !this.form.end_date) { this.leaveError = 'حدد تاريخ البداية والنهاية'; return; }
    this.submitting = true;
    this.leaveError = '';
    this.hr.submitLeave(this.form).subscribe({
      next: () => {
        this.submitting = false;
        this.form = { start_date: '', end_date: '', type: 'annual', reason: '' };
        this.loadLeaves();
      },
      error: (e) => { this.submitting = false; this.leaveError = e?.error?.message || 'تعذّر إرسال الطلب'; },
    });
  }
}
