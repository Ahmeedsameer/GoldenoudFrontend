import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AllInvoicesService, AllInvoiceRow, AllInvoicesType } from '../../services/all-invoices.service';
import { LoadingComponent } from '../../loading/loading.component';
import { DatePickerComponent } from '../../shared/components/form/date-picker/date-picker.component';

interface TypeTab { key: AllInvoicesType; label: string; }

const TYPE_TABS: TypeTab[] = [
  { key: 'all',                label: 'الكل' },
  { key: 'sale',                label: 'فواتير البيع' },
  { key: 'purchase',            label: 'فواتير الشراء' },
  { key: 'internal_transfer',   label: 'فواتير النقل الداخلي' },
];

/**
 * Admin-only: every invoice-like document in the system in one timeline —
 * sales, purchases, and internal transfers — sorted by real timestamp, each
 * row linking straight into its own existing detail screen. See
 * AdminAllInvoicesController for why these three tables are merged in PHP
 * rather than a single SQL query (they don't share a schema).
 */
@Component({
  selector: 'app-all-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, DatePickerComponent],
  templateUrl: './all-invoices.component.html',
})
export class AllInvoicesComponent implements OnInit {
  private service = inject(AllInvoicesService);
  private router = inject(Router);

  tabs = TYPE_TABS;
  activeType: AllInvoicesType = 'all';

  from = '';
  to = '';

  loading = false;
  rows: AllInvoiceRow[] = [];
  currentPage = 1;
  lastPage = 1;
  total = 0;
  summary: any = null;

  ngOnInit(): void {
    this.load();
  }

  setType(t: AllInvoicesType): void {
    this.activeType = t;
    this.currentPage = 1;
    this.load();
  }

  applyRange(): void { this.currentPage = 1; this.load(); }
  clearRange(): void { this.from = ''; this.to = ''; this.currentPage = 1; this.load(); }

  load(): void {
    this.loading = true;
    const params: any = { type: this.activeType, page: this.currentPage, per_page: 25 };
    if (this.from) params.date_from = this.from;
    if (this.to) params.date_to = this.to;

    this.service.getAll(params).subscribe({
      next: (res) => {
        const data = res?.data;
        this.rows = data?.data ?? [];
        this.currentPage = data?.current_page ?? 1;
        this.lastPage = data?.last_page ?? 1;
        this.total = data?.total ?? this.rows.length;
        this.summary = data?.summary ?? null;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  prevPage(): void { if (this.currentPage > 1) { this.currentPage--; this.load(); } }
  nextPage(): void { if (this.currentPage < this.lastPage) { this.currentPage++; this.load(); } }

  open(row: AllInvoiceRow): void {
    this.router.navigateByUrl(row.link);
  }

  typeBadgeClass(type: string): string {
    return {
      sale: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400',
      purchase: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400',
      internal_transfer: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400',
    }[type] || 'bg-gray-100 text-gray-600';
  }
}
