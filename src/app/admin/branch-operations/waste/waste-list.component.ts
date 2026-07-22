import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { WasteService, WasteRecord, WasteReason } from '../../../services/waste.service';
import { ShopService } from '../../../services/shop.service';
import { ProductService } from '../../../services/product.service';
import { AuthService } from '../../../services/auth.service';

const REASONS: { key: WasteReason; label: string }[] = [
  { key: 'broken', label: 'كسر' },
  { key: 'expired', label: 'انتهاء صلاحية' },
  { key: 'leakage', label: 'تسرب' },
  { key: 'lost', label: 'فقدان' },
  { key: 'damaged_during_transfer', label: 'تلف أثناء النقل' },
  { key: 'other', label: 'أخرى' },
];

@Component({
  selector: 'app-waste-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, ReportEmptyStateComponent],
  templateUrl: './waste-list.component.html',
})
export class WasteListComponent implements OnInit {
  private svc = inject(WasteService);
  private shopSvc = inject(ShopService);
  private productSvc = inject(ProductService);
  private auth = inject(AuthService);

  reasons = REASONS;
  reasonLabel(r: string): string { return REASONS.find((x) => x.key === r)?.label ?? r; }

  loading = false;
  errorMsg = '';
  records: WasteRecord[] = [];
  meta: { current_page: number; last_page: number; total: number } | null = null;
  page = 1;

  shops: { id: number; name: string }[] = [];
  products: { id: number; name: string; sku: string }[] = [];

  shopFilter: number | null = null;
  reasonFilter = '';

  showForm = false;
  saving = false;
  formError = '';
  form = { shop_id: null as number | null, product_id: null as number | null, quantity: null as number | null, reason: 'broken' as WasteReason, notes: '' };

  get isManager(): boolean { return this.auth.getUserRole() === 'manager'; }

  ngOnInit(): void {
    const userShopId = this.auth.getUser()?.shop_id ?? null;
    this.shopSvc.getShops({ per_page: 200 }).subscribe({
      next: (res) => {
        this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name }));
        if (this.isManager && userShopId) { this.shopFilter = userShopId; this.form.shop_id = userShopId; }
        this.load();
      },
    });
    this.productSvc.getProducts({ per_page: 500, exclude_type: 'COMPOUND' }).subscribe({
      next: (res) => { this.products = (res.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku })); },
    });
  }

  load(): void {
    this.loading = true;
    this.svc.list({ shop_id: this.shopFilter ?? undefined, reason: this.reasonFilter || undefined, page: this.page, per_page: 25 }).subscribe({
      next: (page) => {
        this.records = page.data;
        this.meta = { current_page: page.current_page, last_page: page.last_page, total: page.total };
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilters(): void { this.page = 1; this.load(); }
  nextPage(): void { if (this.meta && this.page < this.meta.last_page) { this.page++; this.load(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.formError = '';
  }

  submitForm(): void {
    this.formError = '';
    if (!this.form.shop_id || !this.form.product_id || !this.form.quantity || this.form.quantity <= 0) {
      this.formError = 'يجب اختيار الفرع والمنتج وإدخال كمية صحيحة';
      return;
    }
    this.saving = true;
    this.svc.register({
      shop_id: this.form.shop_id, product_id: this.form.product_id, quantity: this.form.quantity,
      reason: this.form.reason, notes: this.form.notes || undefined,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.form = { shop_id: this.form.shop_id, product_id: null, quantity: null, reason: 'broken', notes: '' };
        this.page = 1;
        this.load();
      },
      error: (err) => { this.saving = false; this.formError = err?.error?.message || err?.error?.errors?.quantity?.[0] || 'حدث خطأ أثناء تسجيل الهالك'; },
    });
  }
}
