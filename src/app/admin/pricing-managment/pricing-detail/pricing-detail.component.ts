import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../loading/loading.component';
import { AuthService } from '../../../services/auth.service';
import { PricingBatch, PricingDetail, PriceHistoryRow, PricingService } from '../../../services/pricing.service';

@Component({
  selector: 'app-pricing-detail',
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent],
  templateUrl: './pricing-detail.component.html',
})
export class PricingDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private pricingService = inject(PricingService);
  private authService = inject(AuthService);

  productId!: number;
  detail: PricingDetail | null = null;
  loading = false;

  history: PriceHistoryRow[] = [];
  historyLoading = false;
  historyPage = 1;
  historyLastPage = 1;

  editing = false;
  newPrice: number | null = null;
  reason = '';
  saving = false;
  saveError = '';

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
    if (this.isAdmin) {
      this.loadHistory();
    }
  }

  load(): void {
    this.loading = true;
    this.pricingService.detail(this.productId).subscribe({
      next: (d) => { this.detail = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadHistory(page = 1): void {
    this.historyLoading = true;
    this.pricingService.history(this.productId, page).subscribe({
      next: (res) => {
        this.history = res.data;
        this.historyPage = res.meta.current_page;
        this.historyLastPage = res.meta.last_page;
        this.historyLoading = false;
      },
      error: () => { this.historyLoading = false; },
    });
  }

  startEdit(): void {
    this.editing = true;
    this.newPrice = this.detail?.selling_price ?? null;
    this.reason = '';
    this.saveError = '';
  }

  cancelEdit(): void {
    this.editing = false;
    this.newPrice = null;
    this.reason = '';
    this.saveError = '';
  }

  save(): void {
    if (!this.newPrice || this.newPrice <= 0) return;
    this.saving = true;
    this.saveError = '';
    this.pricingService.updateSellingPrice(this.productId, this.newPrice, this.reason || undefined).subscribe({
      next: (d) => {
        this.detail = d;
        this.saving = false;
        this.editing = false;
        this.loadHistory();
      },
      error: (err) => {
        this.saving = false;
        this.saveError = err?.error?.message || 'تعذّر حفظ السعر.';
      },
    });
  }

  historyLabel(type: PriceHistoryRow['type']): string {
    if (type === 'cost_update') return 'تحديث تكلفة';
    if ((type as string) === 'batch_pricing') return 'تسعير دفعة';
    return 'تعديل سعر';
  }

  typeLabel(type: PricingDetail['product_type'] | undefined): string {
    switch (type) {
      case 'COMPOUND': return 'عطر مركّب';
      case 'RAW_MATERIAL': return 'مادة خام';
      case 'PACKAGING': return 'عبوة / تغليف';
      default: return 'منتج جاهز';
    }
  }

  priceLabel(detail: PricingDetail): string {
    return detail.pricing_field === 'price_per_gram' ? `سعر الوحدة (لكل ${detail.unit || 'وحدة'})` : 'سعر البيع';
  }

  statusLabel(status: PricingDetail['status']): string {
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

  statusClass(status: PricingDetail['status']): string {
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

  batchStatusLabel(status: PricingBatch['status']): string {
    switch (status) {
      case 'waiting_for_pricing': return 'بانتظار التسعير';
      case 'active': return 'الدفعة الحالية (يُباع منها الآن)';
      case 'queued': return 'بالانتظار';
      case 'archived': return 'مؤرشفة';
      default: return 'مُستنفدة';
    }
  }

  batchStatusClass(status: PricingBatch['status']): string {
    switch (status) {
      case 'waiting_for_pricing': return 'bg-[#FEE2E2] text-[#B91C1C]';
      case 'active': return 'bg-[#D1FAE5] text-[#065F46]';
      case 'queued': return 'bg-[#DBEAFE] text-[#1E40AF]';
      case 'archived': return 'bg-[#F3F4F6] text-[#6B7280]';
      default: return 'bg-[#F3F4F6] text-[#6B7280]';
    }
  }

  // ── Batch archiving — retires a batch from future sale, never a delete ──

  archiving = false;
  archiveError = '';

  archiveBatch(batch: PricingBatch): void {
    if (batch.is_archived) return;
    if (!confirm('سيتم إيقاف بيع هذه الدفعة نهائياً (لن تُحذف، وستبقى ظاهرة في الفواتير القديمة). هل تريد المتابعة؟')) return;

    this.archiving = true;
    this.archiveError = '';
    this.pricingService.archiveBatch(this.productId, batch.id).subscribe({
      next: (d) => { this.detail = d; this.archiving = false; },
      error: (err) => {
        this.archiving = false;
        this.archiveError = err?.error?.message || 'تعذّرت أرشفة الدفعة.';
      },
    });
  }

  // ── Batch pricing (Ready Products / Packaging / any future batch-priced item) ──

  pricingBatchId: number | null = null;
  batchPrice: number | null = null;
  batchReason = '';
  batchSaving = false;
  batchSaveError = '';

  get isBatchPriced(): boolean {
    return this.detail?.pricing_field === 'batch';
  }

  startBatchPricing(batch: PricingBatch): void {
    this.pricingBatchId = batch.id;
    this.batchPrice = null;
    this.batchReason = '';
    this.batchSaveError = '';
  }

  cancelBatchPricing(): void {
    this.pricingBatchId = null;
    this.batchPrice = null;
    this.batchReason = '';
    this.batchSaveError = '';
  }

  saveBatchPrice(): void {
    if (!this.pricingBatchId || !this.batchPrice || this.batchPrice <= 0) return;
    this.batchSaving = true;
    this.batchSaveError = '';
    this.pricingService.priceBatch(this.productId, this.pricingBatchId, this.batchPrice, this.batchReason || undefined).subscribe({
      next: (d) => {
        this.detail = d;
        this.batchSaving = false;
        this.cancelBatchPricing();
        this.loadHistory();
      },
      error: (err) => {
        this.batchSaving = false;
        this.batchSaveError = err?.error?.message || 'تعذّر حفظ سعر الدفعة.';
      },
    });
  }
}
