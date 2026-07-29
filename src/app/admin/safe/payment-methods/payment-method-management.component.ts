import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SafeService } from '../../../services/safe.service';
import { StockService } from '../../../services/stock.service';
import { PaymentMethod, PaymentMethodType, PAYMENT_METHOD_TYPE_LABELS, CARD_PAYMENT_TYPES } from '../../../models/sales.model';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';

const TYPES: { value: PaymentMethodType; label: string }[] = Object.entries(PAYMENT_METHOD_TYPE_LABELS)
  .map(([value, label]) => ({ value: value as PaymentMethodType, label }));

/**
 * Payment Methods (admin) — unlimited, replaces the old hardcoded cash/visa
 * enum. Card-type methods (visa/mastercard/bank_card) may carry a processing
 * fee %, deducted from the customer's payment at sale time (see
 * SalesService::createInvoice()) — the invoice total itself never changes.
 */
@Component({
  selector: 'app-payment-method-management',
  imports: [CommonModule, ReactiveFormsModule, LoadingComponent, ModalComponent, AlertComponent],
  templateUrl: './payment-method-management.component.html',
})
export class PaymentMethodManagementComponent implements OnInit {
  private safeService = inject(SafeService);
  private stockService = inject(StockService);
  private fb = inject(FormBuilder);

  methods: PaymentMethod[] = [];
  currencies: { id: number; code: string; symbol?: string }[] = [];
  safes: { id: number; name: string }[] = [];
  shops: { id: number; name: string }[] = [];
  loading = false;

  readonly types = TYPES;
  readonly typeLabels = PAYMENT_METHOD_TYPE_LABELS;

  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  editTarget: PaymentMethod | null = null;
  modalLoading = false;
  modalError = '';

  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    /** Bank Cards module — issuing bank (CIB, QNB, Banque Misr, HSBC, ...), only meaningful for card types. */
    bank: [''],
    /** Wallet's phone number — only meaningful when type === 'mobile_wallet'. */
    wallet_phone: [''],
    type: ['cash', Validators.required],
    currency_id: [null, Validators.required],
    processing_fee_percent: [0],
    is_active: [true],
    safe_id: [null],
    shop_ids: [[] as number[]],
  });

  get isCardType(): boolean {
    return CARD_PAYMENT_TYPES.includes(this.form.get('type')?.value);
  }

  get isWalletType(): boolean {
    return this.form.get('type')?.value === 'mobile_wallet';
  }

  ngOnInit(): void {
    this.load();
    this.safeService.getCurrencies({ active_only: true }).subscribe({
      next: (res) => { this.currencies = res.data || []; },
    });
    this.safeService.getSafes().subscribe({
      next: (res) => { this.safes = (res.data || []).map((s: any) => ({ id: s.id, name: s.shop?.name ? `${s.shop.name} — ${s.safe_type?.name ?? ''}` : `الخزنة الرئيسية — ${s.safe_type?.name ?? ''}` })); },
    });
    this.stockService.getActiveShops().subscribe({
      next: (shops) => { this.shops = shops; },
    });
  }

  toggleShop(shopId: number, checked: boolean): void {
    const current: number[] = this.form.get('shop_ids')?.value || [];
    const next = checked ? [...current, shopId] : current.filter((id) => id !== shopId);
    this.form.get('shop_ids')?.setValue(next);
  }

  isShopChecked(shopId: number): boolean {
    return (this.form.get('shop_ids')?.value || []).includes(shopId);
  }

  load() {
    this.loading = true;
    this.safeService.getPaymentMethods().subscribe({
      next: (res) => { this.methods = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openCreate() {
    this.modalMode = 'create';
    this.editTarget = null;
    this.modalError = '';
    this.form.reset({ name: '', bank: '', wallet_phone: '', type: 'cash', currency_id: this.currencies[0]?.id ?? null, processing_fee_percent: 0, is_active: true, safe_id: null, shop_ids: [] });
    this.showModal = true;
  }

  openEdit(m: PaymentMethod) {
    this.modalMode = 'edit';
    this.editTarget = m;
    this.modalError = '';
    this.form.patchValue({
      name: m.name, bank: m.bank ?? '', wallet_phone: m.wallet_phone ?? '', type: m.type, currency_id: m.currency_id,
      processing_fee_percent: m.processing_fee_percent, is_active: m.is_active,
      safe_id: m.safe_id ?? null, shop_ids: (m.shops || []).map((s) => s.id),
    });
    this.showModal = true;
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.modalLoading = true;
    this.modalError = '';

    const v = this.form.value;
    const req$ = this.modalMode === 'create'
      ? this.safeService.createPaymentMethod(v)
      : this.safeService.updatePaymentMethod(this.editTarget!.id, v);

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

  toggle(m: PaymentMethod) {
    this.safeService.togglePaymentMethod(m.id).subscribe({
      next: (res) => { this.alert = { show: true, type: 'success', message: res.message }; this.load(); },
    });
  }

  typeLabel(type: string): string { return this.typeLabels[type as PaymentMethodType] ?? type; }
  isCard(type: string): boolean { return CARD_PAYMENT_TYPES.includes(type as PaymentMethodType); }

  f(name: string) { return this.form.get(name); }
  isInvalid(name: string) { return this.f(name)?.invalid && this.f(name)?.touched; }
}
