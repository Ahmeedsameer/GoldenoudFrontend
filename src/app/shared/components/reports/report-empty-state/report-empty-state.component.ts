import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** The one "no data" state every report table/section uses. */
@Component({
  selector: 'app-report-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <span class="text-3xl mb-2 opacity-50">{{ icon }}</span>
      <p class="text-sm text-gray-400">{{ message }}</p>
    </div>
  `,
})
export class ReportEmptyStateComponent {
  @Input() message = 'لا توجد بيانات لعرضها';
  @Input() icon = '📭';
}
