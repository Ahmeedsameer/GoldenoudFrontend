import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../loading/loading.component';
import { AuthService } from '../../../services/auth.service';
import { PricingDetail, PriceHistoryRow, PricingService } from '../../../services/pricing.service';

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
    return type === 'cost_update' ? 'تحديث تكلفة' : 'تعديل سعر';
  }
}
