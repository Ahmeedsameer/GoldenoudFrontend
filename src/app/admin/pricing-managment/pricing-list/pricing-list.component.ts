import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { SearchBarComponent } from '../../../shared/components/common/search-bar/search-bar.component';
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
  imports: [CommonModule, RouterLink, LoadingComponent, ModalComponent, ReportToolbarComponent, SearchBarComponent],
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

  /** Raw Materials (oils priced per gram/ml, plus Alcohol and other
   *  product-priced raw materials) — real purchase cost, same as Ready
   *  Products, just priced by weight/volume instead of by piece. */
  get rawMaterialRows(): PricingRow[] {
    return this.rows.filter((r) => r.product_type === 'RAW_MATERIAL');
  }

  /** Packaging (bottles and other packaging) — real purchase cost, priced
   *  by the piece exactly like Ready Products. */
  get packagingRows(): PricingRow[] {
    return this.rows.filter((r) => r.product_type === 'PACKAGING');
  }

  priceLabel(row: PricingRow): string {
    return row.pricing_field === 'price_per_gram' ? `سعر الوحدة (لكل ${row.unit || 'وحدة'})` : 'سعر البيع';
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
    switch (status) {
      case 'needs_review': return '🟡 يحتاج مراجعة سعر';
      case 'no_price': return 'بلا سعر';
      case 'waiting_for_first_supply': return 'بانتظار أول توريد';
      case 'needs_initial_pricing': return 'يحتاج تسعير أولي';
      case 'priced': return 'مُسعَّر';
      case 'pricing_update_required': return 'يحتاج تحديث تسعير';
      case 'inactive': return 'غير نشط';
      default: return 'محدَّث';
    }
  }

  /** Badge color classes for the 5 batch-pricing statuses + legacy ones. */
  statusClass(status: PricingRow['status']): string {
    switch (status) {
      case 'needs_review':
      case 'needs_initial_pricing':
      case 'pricing_update_required':
        return 'bg-[#FEF3C7] text-[#92400E]';
      case 'no_price':
      case 'waiting_for_first_supply':
      case 'inactive':
        return 'bg-[#F3F4F6] text-[#6B7280]';
      default:
        return 'bg-[#D1FAE5] text-[#065F46]';
    }
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
