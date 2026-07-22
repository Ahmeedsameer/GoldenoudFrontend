import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * The one in-content loading placeholder every report uses while its data
 * is being fetched — distinct from the full-page `app-loading` spinner,
 * this renders skeleton KPI cards + a skeleton table so the page layout
 * doesn't jump once real data arrives.
 */
@Component({
  selector: 'app-report-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6 animate-pulse" dir="rtl">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        @for (i of kpiPlaceholders; track i) {
          <div class="h-24 rounded-2xl bg-gray-100 dark:bg-white/[0.05]"></div>
        }
      </div>
      @if (showChart) {
        <div class="h-64 rounded-2xl bg-gray-100 dark:bg-white/[0.05]"></div>
      }
      <div class="rounded-2xl bg-gray-100 dark:bg-white/[0.05] overflow-hidden">
        @for (i of rowPlaceholders; track i) {
          <div class="h-11 border-b border-white/40 dark:border-black/20 last:border-0"></div>
        }
      </div>
    </div>
  `,
})
export class ReportLoadingSkeletonComponent {
  @Input() kpiCount = 4;
  @Input() rowCount = 6;
  @Input() showChart = true;

  get kpiPlaceholders(): number[] { return Array.from({ length: this.kpiCount }, (_, i) => i); }
  get rowPlaceholders(): number[] { return Array.from({ length: this.rowCount }, (_, i) => i); }
}
