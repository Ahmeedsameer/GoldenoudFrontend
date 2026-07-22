import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ReportKpiColor = 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

const COLOR_CLASSES: Record<ReportKpiColor, { border: string; bg: string; text: string; value: string }> = {
  brand:   { border: 'border-brand-200 dark:border-brand-500/30',   bg: 'bg-brand-50 dark:bg-brand-500/10',     text: 'text-brand-700 dark:text-brand-400',   value: 'text-brand-800 dark:text-brand-200' },
  success: { border: 'border-success-200 dark:border-success-500/30', bg: 'bg-success-50 dark:bg-success-500/10', text: 'text-success-700 dark:text-success-400', value: 'text-success-800 dark:text-success-200' },
  warning: { border: 'border-amber-200 dark:border-amber-500/30',   bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-700 dark:text-amber-400',   value: 'text-amber-800 dark:text-amber-200' },
  error:   { border: 'border-error-200 dark:border-error-500/30',   bg: 'bg-error-50 dark:bg-error-500/10',     text: 'text-error-700 dark:text-error-400',   value: 'text-error-800 dark:text-error-200' },
  info:    { border: 'border-blue-200 dark:border-blue-500/30',     bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-700 dark:text-blue-400',     value: 'text-blue-800 dark:text-blue-200' },
  neutral: { border: 'border-gray-200 dark:border-white/[0.07]',    bg: 'bg-white dark:bg-gray-900',            text: 'text-gray-500 dark:text-gray-400',     value: 'text-gray-900 dark:text-white' },
};

/**
 * The one KPI card every report uses — same border/spacing/typography
 * everywhere so a report only ever supplies title/value/icon/color/trend,
 * never its own card markup.
 */
@Component({
  selector: 'app-report-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border p-5 shadow-sm" [ngClass]="[colors.border, colors.bg]">
      <div class="flex items-center justify-between mb-1">
        <p class="text-xs font-medium" [ngClass]="colors.text">{{ title }}</p>
        @if (icon) { <span class="text-lg leading-none">{{ icon }}</span> }
      </div>
      <p class="text-2xl font-bold" [class.font-mono]="mono" [ngClass]="colors.value">
        {{ value ?? '—' }}<span *ngIf="suffix" class="text-sm font-normal mr-1">{{ suffix }}</span>
      </p>
      @if (subtitle) {
        <p class="text-xs mt-1" [ngClass]="colors.text">{{ subtitle }}</p>
      }
      @if (trend) {
        <p class="text-xs mt-1 font-medium" [class]="trend.direction === 'up' ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'">
          {{ trend.direction === 'up' ? '▲' : '▼' }} {{ trend.value }}
        </p>
      }
    </div>
  `,
})
export class ReportKpiCardComponent {
  @Input({ required: true }) title!: string;
  @Input() value: string | number | null | undefined = '—';
  @Input() suffix = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() color: ReportKpiColor = 'neutral';
  @Input() mono = true;
  @Input() trend: { value: string | number; direction: 'up' | 'down' } | null = null;

  get colors() { return COLOR_CLASSES[this.color]; }
}
