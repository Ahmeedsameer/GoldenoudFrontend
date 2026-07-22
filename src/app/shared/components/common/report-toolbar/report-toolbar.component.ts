import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportExportService } from '../../../../services/report-export.service';

/**
 * The one export toolbar every report page uses — [Print] [Export PDF]
 * [Export Excel] [Refresh]. Point it at the backend's `.../export` endpoint
 * and pass whatever filters are currently applied; it never knows anything
 * about the report's own data, so the same component works everywhere.
 */
@Component({
  selector: 'app-report-toolbar',
  imports: [CommonModule],
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" (click)="onPrint()" class="lux-btn lux-btn-sm" style="border:1px solid #D1D5DB;">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a1 1 0 001-1v-4a1 1 0 00-1-1H9a1 1 0 00-1 1v4a1 1 0 001 1zm8-14V4a1 1 0 00-1-1H8a1 1 0 00-1 1v3"/></svg>
        طباعة
      </button>
      <button type="button" (click)="onExport('pdf')" class="lux-btn lux-btn-sm" style="border:1px solid #D1D5DB;">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H8a2 2 0 01-2-2V5a2 2 0 012-2h6l6 6v10a2 2 0 01-2 2z"/></svg>
        PDF
      </button>
      <button type="button" (click)="onExport('excel')" class="lux-btn lux-btn-sm" style="border:1px solid #D1D5DB;">
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-9 4h10a2 2 0 002-2V7a2 2 0 00-2-2h-6l-4 4v10a2 2 0 002 2z"/></svg>
        Excel
      </button>
      @if (showRefresh) {
        <button type="button" (click)="refresh.emit()" class="lux-btn lux-btn-sm" style="border:1px solid #D1D5DB;">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          تحديث
        </button>
      }
    </div>
  `,
})
export class ReportToolbarComponent {
  private exportSvc = inject(ReportExportService);

  /** Backend path, e.g. '/reports/sales/export' — must accept ?format=pdf|excel plus `params`. */
  @Input({ required: true }) exportPath!: string;
  @Input() params: Record<string, any> = {};
  @Input() fileName = 'report';
  @Input() showRefresh = true;
  @Output() refresh = new EventEmitter<void>();

  onExport(format: 'pdf' | 'excel'): void {
    this.exportSvc.download(this.exportPath, this.params, format, this.fileName);
  }

  onPrint(): void {
    this.exportSvc.print(this.exportPath, this.params);
  }
}
