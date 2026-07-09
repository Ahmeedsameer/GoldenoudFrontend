import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConventionService } from '../../../services/convention.service';
import { ShopService } from '../../../services/shop.service';
import { Convention } from '../../../models/convention.model';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { ListManager } from '../../../services/list-manager';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-convention-management',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, LoadingComponent, ModalComponent, AlertComponent, PaginationComponent],
  templateUrl: './convention-management.component.html',
})
export class ConventionManagementComponent implements OnInit {
  private conventionService = inject(ConventionService);
  private shopService = inject(ShopService);
  private fb = inject(FormBuilder);

  shops: any[] = [];

  list = new ListManager<Convention>(
    (params) => this.conventionService.getAll(params).pipe(map((r) => r.data))
  );

  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  // ── Create / Edit modal ─────────────────────────────────
  showFormModal = false;
  editingId: number | null = null;
  formLoading = false;
  formError = '';

  form: FormGroup = this.fb.group({
    shop_id: [null, [Validators.required]],
    amount:  [null, [Validators.required, Validators.min(0.01)]],
  });

  // ── Delete modal ────────────────────────────────────────
  showDeleteModal = false;
  conventionToDelete: number | null = null;
  deleteLoading = false;

  ngOnInit(): void {
    this.list.load();
    this.shopService.getShops({ per_page: 100 }).subscribe({ next: (r) => (this.shops = r.data || []) });
  }

  // ── Filters ─────────────────────────────────────────────
  setBranchFilter(value: string) { this.list.setFilter('shop_id', value || undefined); }
  setSearch(value: string) { this.list.setFilter('search', value || undefined); }

  // ── Helpers ─────────────────────────────────────────────
  spent(c: Convention): number { return +(c.transactions_sum_amount ?? 0); }
  remaining(c: Convention): number { return +c.amount - this.spent(c); }

  // ── Create / Edit ───────────────────────────────────────
  openCreate() {
    this.editingId = null;
    this.formError = '';
    this.form.reset({ shop_id: null, amount: null });
    this.form.get('shop_id')?.enable();
    this.showFormModal = true;
  }

  openEdit(c: Convention) {
    this.editingId = c.id;
    this.formError = '';
    this.form.reset({ shop_id: c.shop_id, amount: +c.amount });
    this.form.get('shop_id')?.disable(); // branch is fixed on edit
    this.showFormModal = true;
  }

  submitForm() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.formLoading = true;
    this.formError = '';

    const v = this.form.getRawValue();
    const req$ = this.editingId
      ? this.conventionService.update(this.editingId, { amount: +v.amount })
      : this.conventionService.create({ amount: +v.amount, shop_id: +v.shop_id });

    req$.subscribe({
      next: (res) => {
        this.formLoading = false;
        this.showFormModal = false;
        this.alert = { show: true, type: 'success', message: res.message };
        this.list.load();
      },
      error: (err) => {
        this.formLoading = false;
        this.formError = err?.error?.message || 'حدث خطأ غير متوقع.';
      },
    });
  }

  // ── Delete ──────────────────────────────────────────────
  confirmDelete(id: number) {
    this.conventionToDelete = id;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.conventionToDelete = null;
  }

  deleteConvention() {
    if (!this.conventionToDelete) return;
    this.deleteLoading = true;
    this.conventionService.delete(this.conventionToDelete).subscribe({
      next: (res) => {
        this.deleteLoading = false;
        this.showDeleteModal = false;
        this.conventionToDelete = null;
        this.alert = { show: true, type: 'success', message: res.message };
        this.list.load();
      },
      error: (err) => {
        this.deleteLoading = false;
        this.showDeleteModal = false;
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'حدث خطأ غير متوقع.' };
      },
    });
  }

  f(name: string) { return this.form.get(name); }
  isInvalid(name: string) { return this.f(name)?.invalid && this.f(name)?.touched; }
}
