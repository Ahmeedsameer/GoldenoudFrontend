import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrService } from '../../../services/hr.service';
import { ShopService } from '../../../services/shop.service';
import { AuthService } from '../../../services/auth.service';
import { LoadingComponent } from '../../../loading/loading.component';

interface RosterRow { user_id: number; name: string; role: string; status: string; note: string | null; }

@Component({
  selector: 'app-hr-attendance',
  imports: [CommonModule, FormsModule, LoadingComponent],
  templateUrl: './hr-attendance.component.html',
})
export class HrAttendanceComponent implements OnInit {
  private hr = inject(HrService);
  private shopService = inject(ShopService);
  private auth = inject(AuthService);

  loading = false;
  savingId: number | null = null;

  isManager = false;
  shops: { id: number; name: string }[] = [];
  shopId: number | null = null;
  date = new Date().toISOString().substring(0, 10);
  branchName = '';
  roster: RosterRow[] = [];

  statuses = [
    { value: 'present',  label: 'حاضر',    cls: 'bg-success-500 text-white',  idle: 'text-success-600 border-success-300 hover:bg-success-50 dark:text-success-400 dark:border-success-500/40' },
    { value: 'late',     label: 'متأخر',   cls: 'bg-amber-500 text-white',    idle: 'text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-500/40' },
    { value: 'half_day', label: 'نصف يوم', cls: 'bg-blue-500 text-white',     idle: 'text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-500/40' },
    { value: 'absent',   label: 'غائب',    cls: 'bg-error-500 text-white',    idle: 'text-error-600 border-error-300 hover:bg-error-50 dark:text-error-400 dark:border-error-500/40' },
  ];

  ngOnInit(): void {
    this.isManager = this.auth.isManager?.() ?? false;
    if (!this.isManager) {
      this.shopService.getShops({ page: -1 }).subscribe({
        next: (res) => {
          this.shops = res.data?.data || res.data || res || [];
          if (this.shops.length && this.shopId == null) this.shopId = this.shops[0].id;
          this.load();
        },
        error: () => this.load(),
      });
    } else {
      this.load(); // manager: branch is forced server-side
    }
  }

  load() {
    this.loading = true;
    this.hr.getAttendanceRoster({ date: this.date, shop_id: this.shopId ?? undefined }).subscribe({
      next: (data) => {
        this.roster = data?.roster || [];
        this.branchName = data?.shop?.name || '';
        this.loading = false;
      },
      error: () => { this.roster = []; this.loading = false; },
    });
  }

  counts() {
    const c: any = { present: 0, late: 0, half_day: 0, absent: 0 };
    this.roster.forEach((r) => c[r.status] !== undefined && c[r.status]++);
    return c;
  }

  mark(row: RosterRow, status: string) {
    if (row.status === status) return;
    this.savingId = row.user_id;
    const prev = row.status;
    row.status = status; // optimistic
    this.hr.markAttendance({ user_id: row.user_id, date: this.date, status }).subscribe({
      next: () => { this.savingId = null; },
      error: () => { row.status = prev; this.savingId = null; },
    });
  }
}
