import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConventionService } from '../../services/convention.service';
import { ShopService } from '../../services/shop.service';
import { Convention } from '../../models/convention.model';
import { LoadingComponent } from '../../loading/loading.component';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-convention-shop',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, LoadingComponent, ModalComponent, AlertComponent],
  templateUrl: './convention-shop.component.html',
})
export class ConventionShopComponent implements OnInit {
  private conventionService = inject(ConventionService);
  private shopService = inject(ShopService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  shopId!: number;
  shopName = '';
  conventions: Convention[] = [];
  loading = false;

  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  // ── Create / Edit modal ─────────────────────────────────
  showFormModal = false;
  editingId: number | null = null;
  formLoading = false;
  formError = '';

  form: FormGroup = this.fb.group({
    amount: [null, [Validators.required, Validators.min(0.01)]],
  });

  // ── Delete modal ────────────────────────────────────────
  showDeleteModal = false;
  conventionToDelete: number | null = null;
  deleteLoading = false;

  ngOnInit(): void {
    this.shopId = +this.route.snapshot.params['shopId'];
    this.load();
    this.shopService.getShopById(this.shopId).subscribe({
      next: (res) => { this.shopName = (res.data || res)?.name || ''; },
    });
  }

  load() {
    this.loading = true;
    this.conventionService.getByShop(this.shopId).subscribe({
      next: (res) => { this.conventions = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  // ── Helpers ─────────────────────────────────────────────
  spent(c: Convention): number {
    return +(c.transactions_sum_amount ?? 0);
  }

  remaining(c: Convention): number {
    return +c.amount - this.spent(c);
  }

  // ── Create / Edit ───────────────────────────────────────
  openCreate() {
    this.editingId = null;
    this.formError = '';
    this.form.reset({ amount: null });
    this.showFormModal = true;
  }

  openEdit(c: Convention) {
    this.editingId = c.id;
    this.formError = '';
    this.form.reset({ amount: +c.amount });
    this.showFormModal = true;
  }

  submitForm() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.formLoading = true;
    this.formError = '';

    const amount = +this.form.value.amount;
    const req$ = this.editingId
      ? this.conventionService.update(this.editingId, { amount })
      : this.conventionService.create({ amount, shop_id: this.shopId });

    req$.subscribe({
      next: (res) => {
        this.formLoading = false;
        this.showFormModal = false;
        this.alert = { show: true, type: 'success', message: res.message };
        this.load();
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
        this.load();
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
