import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HrService } from '../../services/hr.service';
import { LoadingComponent } from '../../loading/loading.component';

@Component({
  selector: 'app-my-profile',
  imports: [CommonModule, LoadingComponent],
  templateUrl: './my-profile.component.html',
})
export class MyProfileComponent implements OnInit {
  private hr = inject(HrService);

  loading = false;
  data: any = null;
  timeline: any[] = [];

  actionLabels: Record<string, string> = {
    'employee.created': 'تعيين الموظف', 'salary.changed': 'تغيير الراتب الأساسي',
    'commission.changed': 'تغيير نسبة العمولة', 'role.changed': 'تغيير الدور الوظيفي',
    'primary_branch.changed': 'تغيير الفرع الأساسي', 'status.changed': 'تغيير الحالة',
    'transfer.created': 'إنشاء طلب نقل', 'transfer.approved': 'اعتماد نقل', 'transfer.activated': 'تفعيل نقل',
    'transfer.completed': 'انتهاء نقل', 'transfer.cancelled': 'إلغاء نقل',
    'leave.created': 'طلب إجازة', 'leave.approved': 'اعتماد إجازة', 'leave.rejected': 'رفض إجازة',
    'leave.cancelled': 'إلغاء إجازة', 'leave.ended_early': 'إنهاء إجازة مبكرًا',
    'bonus.created': 'منح مكافأة', 'bonus.updated': 'تعديل مكافأة', 'bonus.deleted': 'حذف مكافأة',
    'penalty.created': 'تسجيل خصم', 'penalty.updated': 'تعديل خصم', 'penalty.deleted': 'حذف خصم',
    'payroll.generated': 'توليد كشف راتب', 'payroll.locked': 'قفل كشف راتب', 'payroll.unlocked': 'فتح قفل كشف راتب',
    'payroll.paid': 'تعليم الراتب كمدفوع',
  };

  monthNames = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  transferStatusMeta: Record<string, { label: string; cls: string }> = {
    scheduled: { label: 'مجدول',  cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
    active:    { label: 'نشط',    cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' },
    completed: { label: 'مكتمل',  cls: 'bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-gray-400' },
    cancelled: { label: 'ملغي',   cls: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' },
  };

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.hr.myProfile().subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
    this.hr.myTimeline().subscribe({ next: (t) => (this.timeline = t || []), error: () => {} });
  }

  actionLabel(action: string): string { return this.actionLabels[action] || action; }
}
