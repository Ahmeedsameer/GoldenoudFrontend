import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { AuthService } from '../../../services/auth.service';
import { PricingService, PriceUpdateChange, PricingRow } from '../../../services/pricing.service';

/**
 * Pricing Management — the ONLY place selling prices change. Product
 * Management still owns product identity/inventory; Purchasing + FIFO still
 * own cost/stock. This screen just reads the live cost Purchasing produced
 * and lets the Admin decide, deliberately, whether/when to act on it —
 * nothing here ever runs automatically.
 */
@Component({
  selector: 'app-pricing-list',
  imports: [CommonModule, RouterLink, LoadingComponent, ModalComponent, ReportToolbarComponent],
  templateUrl: './pricing-list.component.html',
})
export class PricingListComponent implements OnInit {
  private pricingService = inject(PricingService);
  private authService = inject(AuthService);

  rows: PricingRow[] = [];
  loading = false;
  search = '';

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /** Ready Products have a trackable purchase cost; Compound Products never
   *  do (every sale composes a different oil+bottle) — kept as two visually
   *  separate sections so cost/profit columns never appear next to a
   *  Compound row that has no such concept. */
  get readyRows(): PricingRow[] {
    return this.rows.filter((r) => r.product_type === 'READY_PRODUCT');
  }

  get compoundRows(): PricingRow[] {
    return this.rows.filter((r) => r.product_type === 'COMPOUND');
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.pricingService.list(this.search || undefined).subscribe({
      next: (rows) => { this.rows = rows; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  onSearch(value: string): void {
    this.search = value;
    this.load();
  }

  statusLabel(status: PricingRow['status']): string {
    if (status === 'needs_review') return '🟡 يحتاج مراجعة سعر';
    if (status === 'no_price') return 'بلا سعر';
    return 'محدَّث';
  }

  // ── "Update Prices" — preview, pick a subset, then explicit confirm ──────
  showPreviewModal = false;
  previewLoading = false;
  previewChanges: PriceUpdateChange[] = [];
  selectedIds = new Set<number>();
  applying = false;
  appliedChanges: PriceUpdateChange[] | null = null;

  openUpdatePreview(): void {
    this.previewLoading = true;
    this.showPreviewModal = true;
    this.appliedChanges = null;
    this.pricingService.previewUpdate().subscribe({
      next: (changes) => {
        this.previewChanges = changes;
        this.selectedIds = new Set(changes.map((c) => c.id)); // all selected by default
        this.previewLoading = false;
      },
      error: () => { this.previewLoading = false; },
    });
  }

  closePreview(): void {
    this.showPreviewModal = false;
    this.previewChanges = [];
    this.selectedIds.clear();
    this.appliedChanges = null;
  }

  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelect(id: number): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }

  get allSelected(): boolean {
    return this.previewChanges.length > 0 && this.selectedIds.size === this.previewChanges.length;
  }

  toggleSelectAll(): void {
    this.selectedIds = this.allSelected ? new Set() : new Set(this.previewChanges.map((c) => c.id));
  }

  confirmUpdate(): void {
    if (this.selectedIds.size === 0) return;
    this.applying = true;
    this.pricingService.applyUpdate(Array.from(this.selectedIds)).subscribe({
      next: (res) => {
        this.applying = false;
        this.appliedChanges = res.data;
        this.previewChanges = [];
        this.load();
      },
      error: () => { this.applying = false; },
    });
  }
}
