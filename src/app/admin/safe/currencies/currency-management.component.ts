import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SafeService } from '../../../services/safe.service';
import { Currency } from '../../../models/safe.model';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-currency-management',
  imports: [CommonModule, ReactiveFormsModule, LoadingComponent, ModalComponent, AlertComponent],
  templateUrl: './currency-management.component.html',
})
export class CurrencyManagementComponent implements OnInit {
  private safeService = inject(SafeService);
  private fb = inject(FormBuilder);

  currencies: Currency[] = [];
  loading = false;

  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  editTarget: Currency | null = null;
  modalLoading = false;
  modalError = '';

  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  form: FormGroup = this.fb.group({
    code:      ['', [Validators.required, Validators.maxLength(5)]],
    name:      ['', Validators.required],
    symbol:    ['', Validators.required],
    rate:      [null, [Validators.required, Validators.min(0.0001)]],
    is_active: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.safeService.getCurrencies().subscribe({
      next: (res) => { this.currencies = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openCreate() {
    this.modalMode = 'create';
    this.editTarget = null;
    this.modalError = '';
    this.form.reset({ code: '', name: '', symbol: '', rate: null, is_active: true });
    this.form.get('code')?.enable();
    this.showModal = true;
  }

  openEdit(c: Currency) {
    this.modalMode = 'edit';
    this.editTarget = c;
    this.modalError = '';
    this.form.patchValue({ code: c.code, name: c.name, symbol: c.symbol, rate: c.rate, is_active: c.is_active });
    this.form.get('code')?.disable();
    this.showModal = true;
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.modalLoading = true;
    this.modalError = '';

    const v = this.form.getRawValue();
    const req$ = this.modalMode === 'create'
      ? this.safeService.createCurrency(v)
      : this.safeService.updateCurrency(this.editTarget!.id, { name: v.name, symbol: v.symbol, rate: +v.rate, is_active: v.is_active });

    req$.subscribe({
      next: (res) => {
        this.modalLoading = false;
        this.showModal = false;
        this.alert = { show: true, type: 'success', message: res.message };
        this.load();
      },
      error: (err) => {
        this.modalLoading = false;
        this.modalError = err?.error?.message || 'حدث خطأ غير متوقع.';
      },
    });
  }

  f(name: string) { return this.form.get(name); }
  isInvalid(name: string) { return this.f(name)?.invalid && this.f(name)?.touched; }
}
