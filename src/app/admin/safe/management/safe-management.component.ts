import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SafeService } from '../../../services/safe.service';
import { Safe, SafeType } from '../../../models/safe.model';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ShopService } from '../../../services/shop.service';

@Component({
  selector: 'app-safe-management',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LoadingComponent, ModalComponent, AlertComponent],
  templateUrl: './safe-management.component.html',
})
export class SafeManagementComponent implements OnInit {
  private safeService = inject(SafeService);
  private shopService = inject(ShopService);
  private fb = inject(FormBuilder);

  safes: Safe[] = [];
  safeTypes: SafeType[] = [];
  shops: any[] = [];
  loading = false;

  activeFilter: 'all' | 'company' | number = 'all';

  showCreateModal = false;
  createLoading = false;
  createError = '';

  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  toggleLoadingId: number | null = null;

  form: FormGroup = this.fb.group({
    safe_type_id: [null, Validators.required],
    shop_id:      [null],
  });

  ngOnInit(): void {
    this.load();
    this.safeService.getSafeTypes().subscribe({ next: (r) => this.safeTypes = r.data });
    this.shopService.getShops({ per_page: 100 }).subscribe({ next: (r) => this.shops = r.data || [] });
  }

  load() {
    this.loading = true;
    const params: any = {};
    if (this.activeFilter === 'company') params['shop_id'] = 'null';
    else if (typeof this.activeFilter === 'number') params['shop_id'] = this.activeFilter;

    this.safeService.getSafes(params).subscribe({
      next: (res) => { this.safes = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  setFilter(f: 'all' | 'company' | number) {
    this.activeFilter = f;
    this.load();
  }

  openCreate() {
    this.createError = '';
    this.form.reset({ safe_type_id: null, shop_id: null });
    this.showCreateModal = true;
  }

  submitCreate() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.createLoading = true;
    this.createError = '';

    const v = this.form.value;
    const body: any = { safe_type_id: +v.safe_type_id };
    if (v.shop_id) body.shop_id = +v.shop_id;

    this.safeService.createSafe(body).subscribe({
      next: (res) => {
        this.createLoading = false;
        this.showCreateModal = false;
        this.alert = { show: true, type: 'success', message: res.message };
        this.load();
      },
      error: (err) => {
        this.createLoading = false;
        this.createError = err?.error?.message || 'حدث خطأ غير متوقع.';
      },
    });
  }

  toggle(safe: Safe) {
    this.toggleLoadingId = safe.id;
    this.safeService.toggleSafe(safe.id).subscribe({
      next: (res) => {
        this.toggleLoadingId = null;
        this.alert = { show: true, type: 'success', message: res.message };
        this.load();
      },
      error: (err) => {
        this.toggleLoadingId = null;
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'حدث خطأ.' };
      },
    });
  }

  shopName(safe: Safe): string {
    return safe.shop ? safe.shop.name : 'الشركة';
  }

  f(name: string) { return this.form.get(name); }
  isInvalid(name: string) { return this.f(name)?.invalid && this.f(name)?.touched; }
}
