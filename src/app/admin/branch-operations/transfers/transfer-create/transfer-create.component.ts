import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { TransferRequestService, TransferPriority } from '../../../../services/transfer-request.service';
import { ShopService } from '../../../../services/shop.service';
import { ProductService } from '../../../../services/product.service';
import { AuthService } from '../../../../services/auth.service';
import { DatePickerComponent } from '../../../../shared/components/form/date-picker/date-picker.component';

interface DraftItem { product_id: number | null; requested_quantity: number | null; available: number | null; loadingAvailable?: boolean; }

@Component({
  selector: 'app-transfer-create',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, DatePickerComponent],
  templateUrl: './transfer-create.component.html',
})
export class TransferCreateComponent implements OnInit {
  private svc = inject(TransferRequestService);
  private shopSvc = inject(ShopService);
  private productSvc = inject(ProductService);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  saving = false;
  errorMsg = '';
  get isAdmin(): boolean { return this.auth.getUserRole() === 'admin'; }
  get isManager(): boolean { return this.auth.getUserRole() === 'manager'; }

  /**
   * Part 5.8 — a branch manager always acts on behalf of their OWN branch
   * (User.shop_id) and can never pick a different one as the requester —
   * the server enforces this too (TransferRequestService::create() overrides
   * whatever destination_shop_id is submitted), this just reflects it in the UI
   * so the manager sees their branch as a fixed fact, not a choice.
   */
  get myShopId(): number | null { return this.auth.getUser()?.shop_id ?? null; }
  get myShopName(): string { return this.shops.find((s) => s.id === this.myShopId)?.name ?? '—'; }

  /** A manager can never pick their own branch as the source — they're always the destination/requester (Part 5.8). */
  get availableSourceShops(): { id: number; name: string }[] {
    return this.isManager ? this.shops.filter((s) => s.id !== this.myShopId) : this.shops;
  }

  /**
   * Informational only — the backend (TransferRequestService::canApproveShop) is the
   * single source of truth for this decision; this just tells the admin in advance
   * that submitting will fast-forward straight to shipped, since admin already owns
   * approval authority over every shop — same create() call either way, no separate flow.
   */
  get willAutoAdvance(): boolean {
    return !!this.sourceShopId && this.isAdmin;
  }

  shops: { id: number; name: string }[] = [];
  /** Compound Products are excluded server-side via exclude_type=COMPOUND (Phase 4, Part 1) — same param Supply/Purchasing already uses to hide them, since they're virtual and have no inventory to move. */
  transferableProducts: { id: number; name: string; sku: string }[] = [];

  sourceShopId: number | null = null;
  destinationShopId: number | null = null;
  priority: TransferPriority = 'normal';
  requestedDate = new Date().toISOString().slice(0, 10);
  notes = '';
  items: DraftItem[] = [{ product_id: null, requested_quantity: null, available: null }];

  ngOnInit(): void {
    this.loading = true;
    this.shopSvc.getShops({ per_page: 200 }).subscribe({
      next: (res) => {
        this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name }));
        if (this.isManager && this.myShopId) { this.destinationShopId = this.myShopId; }
      },
    });
    this.productSvc.getProducts({ per_page: 500, exclude_type: 'COMPOUND' }).subscribe({
      next: (res) => {
        this.transferableProducts = (res.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku }));
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  addItemRow(): void { this.items.push({ product_id: null, requested_quantity: null, available: null }); }
  removeItemRow(i: number): void { this.items.splice(i, 1); }

  onProductChange(item: DraftItem): void {
    item.available = null;
    if (!item.product_id || !this.sourceShopId) return;
    item.loadingAvailable = true;
    this.svc.availableStock(item.product_id, this.sourceShopId).subscribe({
      next: (available) => { item.available = available; item.loadingAvailable = false; },
      error: () => { item.loadingAvailable = false; },
    });
  }

  onSourceShopChange(): void {
    this.items.forEach((item) => this.onProductChange(item));
  }

  private validItems() {
    return this.items.filter((i) => i.product_id && i.requested_quantity && i.requested_quantity > 0);
  }

  save(submitImmediately: boolean): void {
    this.errorMsg = '';

    if (!this.sourceShopId || !this.destinationShopId) {
      this.errorMsg = 'يجب اختيار فرع المصدر وفرع الوجهة';
      return;
    }
    if (this.sourceShopId === this.destinationShopId) {
      this.errorMsg = 'لا يمكن أن يكون فرع المصدر والوجهة نفس الفرع';
      return;
    }
    const items = this.validItems();
    if (!items.length) {
      this.errorMsg = 'يجب إضافة صنف واحد على الأقل بكمية صحيحة';
      return;
    }

    this.saving = true;

    const itemsPayload = items.map((i) => ({ product_id: i.product_id!, requested_quantity: i.requested_quantity! }));
    this.svc.create({
      source_shop_id: this.sourceShopId,
      destination_shop_id: this.destinationShopId,
      requested_date: this.requestedDate,
      priority: this.priority,
      notes: this.notes || undefined,
      submit: submitImmediately,
      items: itemsPayload,
    }).subscribe({
      next: (tr) => { this.saving = false; this.router.navigate(['/dashboard/branch-operations/transfers', tr.id]); },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err?.error?.message || err?.error?.errors?.items?.[0] || 'حدث خطأ أثناء إنشاء طلب النقل';
      },
    });
  }
}
