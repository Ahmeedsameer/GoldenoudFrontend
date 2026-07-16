import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HrService } from '../../services/hr.service';
import { LoadingComponent } from '../../loading/loading.component';

interface Cell {
  date: string;
  type: string | null;
  shift?: { id: number; name: string; color: string; start_time: string; end_time: string } | null;
  start_time?: string | null;
  end_time?: string | null;
  branch_name?: string | null;
  notes?: string | null;
  transfer?: { id: number; branch_name: string | null; start_date: string; end_date: string };
}

const CELL_META: Record<string, { label: string; soft: string }> = {
  work:          { label: 'عمل',           soft: 'bg-success-50 border-success-200 text-success-700 dark:bg-success-500/10 dark:border-success-500/30 dark:text-success-400' },
  leave:         { label: 'إجازة',         soft: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400' },
  off_day:       { label: 'يوم إجازة أسبوعية', soft: 'bg-gray-100 border-gray-200 text-gray-600 dark:bg-white/[0.05] dark:border-gray-700 dark:text-gray-400' },
  holiday:       { label: 'عطلة رسمية',    soft: 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-500/10 dark:border-teal-500/30 dark:text-teal-400' },
  transferred:   { label: 'منقول مؤقتًا',  soft: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/30 dark:text-indigo-400' },
  training:      { label: 'تدريب',         soft: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400' },
  sick_leave:    { label: 'إجازة مرضية',   soft: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400' },
  business_trip: { label: 'مهمة عمل',      soft: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-400' },
  absent:        { label: 'غياب',          soft: 'bg-error-50 border-error-200 text-error-600 dark:bg-error-500/10 dark:border-error-500/30 dark:text-error-400' },
  late:          { label: 'تأخير',         soft: 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-500/10 dark:border-yellow-500/30 dark:text-yellow-400' },
  half_day:      { label: 'نصف يوم',       soft: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400' },
};

const WEEKDAY_NAMES = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

@Component({
  selector: 'app-my-schedule',
  imports: [CommonModule, LoadingComponent],
  templateUrl: './my-schedule.component.html',
})
export class MyScheduleComponent implements OnInit {
  private hr = inject(HrService);

  loading = false;
  cellMeta = CELL_META;
  weekdayNames = WEEKDAY_NAMES;

  currentWeek: { from: string; to: string; days: string[]; cells: Cell[]; branch: string | null } | null = null;
  nextWeek: { from: string; to: string; days: string[]; cells: Cell[]; branch: string | null } | null = null;

  ngOnInit(): void { this.load(); }

  private extract(roster: any): { from: string; to: string; days: string[]; cells: Cell[]; branch: string | null } | null {
    const me = roster?.employees?.[0];
    if (!roster || !me) return null;
    return { from: roster.from, to: roster.to, days: roster.days, cells: me.cells, branch: me.primary_branch };
  }

  load() {
    this.loading = true;
    this.hr.myScheduleWeek().subscribe({
      next: (r) => {
        this.currentWeek = this.extract(r);
        this.loading = false;
        this.loadNextWeek();
      },
      error: () => { this.loading = false; },
    });
  }

  private loadNextWeek() {
    if (!this.currentWeek) return;
    const anchor = new Date(this.currentWeek.to);
    anchor.setDate(anchor.getDate() + 1);
    const iso = anchor.toISOString().substring(0, 10);
    this.hr.myScheduleWeek(iso).subscribe({
      next: (r) => { this.nextWeek = this.extract(r); },
      error: () => {},
    });
  }

  dayLabel(i: number): string { return this.weekdayNames[i] ?? ''; }

  workingDaysCount(cells: Cell[]): number { return cells.filter((c) => c.type === 'work').length; }
  offDaysCount(cells: Cell[]): number { return cells.filter((c) => c.type === 'off_day').length; }
  leaveDaysCount(cells: Cell[]): number { return cells.filter((c) => c.type === 'leave' || c.type === 'sick_leave').length; }
  transferDaysCount(cells: Cell[]): number { return cells.filter((c) => c.type === 'transferred').length; }
}
