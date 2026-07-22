import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportEmptyStateComponent } from '../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { InventoryAdjustmentService, AdjustmentRequest } from '../../../services/inventory-adjustment.service';
import { TransferRequestService } from '../../../services/transfer-request.service';
import { ShopService } from '../../../services/shop.service';
import { ProductService } from '../../../services/product.service';
import { AuthService } from '../../../services/auth.service';

const STATUS_LABELS: Record<string, string> = { pending: 'بانتظار الموافقة', approved: 'تمت الموافقة — بانتظار التنفيذ', rejected: 'مرفوض', executed: 'تم التنفيذ' };
const STATUS_CLASSES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  rejected: 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-300',
  executed: 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300',
};

@Component({
  selector: 'app-adjustment-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, ReportEmptyStateComponent],
  templateUrl: './adjustment-list.component.html',
})
export class AdjustmentListComponent implements OnInit {
  private svc = inject(InventoryAdjustmentService);
  private transferSvc = inject(TransferRequestService);
  private shopSvc = inject(ShopService);
  private productSvc = inject(ProductService);
  private auth = inject(AuthService);

  loading = false;
  actionLoading = false;
  errorMsg = '';
  requests: AdjustmentRequest[] = [];
  meta: { current_page: number; last_page: number; total: number } | null = null;
  page = 1;

  shops: { id: number; name: string }[] = [];
  products: { id: number; name: string; sku: string }[] = [];

  statusFilter = '';
  shopFilter: number | null = null;

  showForm = false;
  saving = false;
  formError = '';
  form = { shop_id: null as number | null, product_id: null as number | null, after_quantity: null as number | null, reason: '' };
  currentQty: number | null = null;
  loadingCurrentQty = false;

  get isAdmin(): boolean { return this.auth.getUserRole() === 'admin'; }
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
    this.svc.list({ status: this.statusFilter || undefined, shop_id: this.shopFilter ?? undefined, page: this.page, per_page: 25 }).subscribe({
      next: (page) => {
        this.requests = page.data;
        this.meta = { current_page: page.current_page, last_page: page.last_page, total: page.total };
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilters(): void { this.page = 1; this.load(); }
  nextPage(): void { if (this.meta && this.page < this.meta.last_page) { this.page++; this.load(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }

  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }
  statusClass(s: string): string { return STATUS_CLASSES[s] ?? 'bg-gray-100 text-gray-600'; }

  toggleForm(): void { this.showForm = !this.showForm; this.formError = ''; }

  onFormProductOrShopChange(): void {
    this.currentQty = null;
    if (!this.form.shop_id || !this.form.product_id) return;
    this.loadingCurrentQty = true;
    this.transferSvc.availableStock(this.form.product_id, this.form.shop_id).subscribe({
      next: (qty) => { this.currentQty = qty; this.loadingCurrentQty = false; },
      error: () => { this.loadingCurrentQty = false; },
    });
  }

  submitForm(): void {
    this.formError = '';
    if (!this.form.shop_id || !this.form.product_id || this.form.after_quantity == null || this.form.after_quantity < 0 || !this.form.reason.trim()) {
      this.formError = 'يجب اختيار الفرع والمنتج وإدخال الكمية الجديدة وسبب التسوية';
      return;
    }
    this.saving = true;
    this.svc.create({
      shop_id: this.form.shop_id, product_id: this.form.product_id,
      after_quantity: this.form.after_quantity, reason: this.form.reason,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.form = { shop_id: this.form.shop_id, product_id: null, after_quantity: null, reason: '' };
        this.currentQty = null;
        this.page = 1;
        this.load();
      },
      error: (err) => { this.saving = false; this.formError = err?.error?.message || 'حدث خطأ أثناء إنشاء طلب التسوية'; },
    });
  }

  private runAction(id: number, obs: import('rxjs').Observable<AdjustmentRequest>): void {
    this.actionLoading = true;
    obs.subscribe({
      next: () => { this.actionLoading = false; this.load(); },
      error: (err) => { this.actionLoading = false; this.errorMsg = err?.error?.message || 'فشل تنفيذ الإجراء'; },
    });
  }

  approve(id: number): void { this.runAction(id, this.svc.approve(id)); }
  reject(id: number): void { this.runAction(id, this.svc.reject(id)); }
  execute(id: number): void { this.runAction(id, this.svc.execute(id)); }
}
