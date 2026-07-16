import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../services/hr.service';
import { LoadingComponent } from '../../loading/loading.component';
import { DatePickerComponent } from '../../shared/components/form/date-picker/date-picker.component';

@Component({
  selector: 'app-my-leave',
  imports: [CommonModule, FormsModule, LoadingComponent, DatePickerComponent],
  templateUrl: './my-leave.component.html',
})
export class MyLeaveComponent implements OnInit {
  private hr = inject(HrService);

  loading = false;
  leaves: any[] = [];
  leaveBalance: any = null;

  submitting = false;
  leaveError = '';
  form = { start_date: '', end_date: '', type: 'annual', reason: '' };

  leaveStatusMeta: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'قيد المراجعة', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
    approved:  { label: 'مقبولة',       cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' },
    rejected:  { label: 'مرفوضة',       cls: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' },
    cancelled: { label: 'ملغاة',        cls: 'bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-gray-400' },
  };

  cancellingId: number | null = null;

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.hr.myLeaves().subscribe({
      next: (d) => { this.leaves = d?.requests?.data || d?.requests || []; this.leaveBalance = d?.balance; this.loading = false; },
      error: () => { this.loading = false; },
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
        this.load();
      },
      error: (e) => { this.submitting = false; this.leaveError = e?.error?.message || 'تعذّر إرسال الطلب'; },
    });
  }

  cancel(leave: any) {
    if (!confirm('إلغاء طلب الإجازة هذا؟')) return;
    this.cancellingId = leave.id;
    this.hr.cancelLeave(leave.id).subscribe({
      next: () => { this.cancellingId = null; this.load(); },
      error: (e) => { this.cancellingId = null; alert(e?.error?.message || 'تعذّر الإلغاء'); },
    });
  }
}
