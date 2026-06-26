import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { SalesService } from '../../services/sales.service';
import { OverrideService, OverrideViolation } from '../../services/override.service';
import { Customer, GoodsSearchResult, TesterUser } from '../../models/sales.model';
import { InvoiceReceiptComponent } from './invoice-receipt/invoice-receipt.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { LabelComponent } from '../../shared/components/form/label/label.component';
import { ComponentCardComponent } from '../../shared/components/common/component-card/component-card.component';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { ProductLookupPanelComponent } from './product-lookup-panel/product-lookup-panel.component';

const LAYOUT_KEY = 'cashier_layout';
type LayoutMode = 'form' | 'pos';

export interface SellerCurrency { id: number; code: string; name: string; symbol: string; rate: number; }
export interface SellerSafe    { id: number; safe_type: { name: string; kind: string }; }

@Component({
  selector: 'app-cashier',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ComponentCardComponent,
    LabelComponent,
    ButtonComponent,
    LoadingComponent,
    AlertComponent,
    ModalComponent,
    ProductLookupPanelComponent,
    FormsModule,
    InvoiceReceiptComponent,
  ],
  templateUrl: './cashier.component.html',
  styleUrl: './cashier.component.css',
})
export class CashierComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private salesService   = inject(SalesService);
  private overrideService = inject(OverrideService);
  private destroy$ = new Subject<void>();

  isSubmitting = false;
  alert: { show: boolean; type: 'success' | 'error' | ''; message: string } = {
    show: false, type: '', message: '',
  };

  // ── Override request state machine ─────────────────────────
  overrideState: 'none' | 'needed' | 'polling' | 'approved' | 'rejected' = 'none';
  overrideRequestId: string | null = null;
  overrideToken:     string | null = null;
  overrideJustification  = '';
  overrideSubmitting     = false;
  overrideRejectionNote  = '';
  private overridePollingInterval: any = null;

  // ── Receipt modal ───────────────────────────────────────────
  showReceiptModal = false;
  lastInvoice: any = null;

  // ── Layout toggle ───────────────────────────────────────
  layoutMode: LayoutMode = (localStorage.getItem(LAYOUT_KEY) as LayoutMode) || 'form';
  toggleLayout() {
    this.layoutMode = this.layoutMode === 'form' ? 'pos' : 'form';
    localStorage.setItem(LAYOUT_KEY, this.layoutMode);
  }

  // ── Quick product lookup panel ──────────────────────────
  /** Whether the lookup panel is expanded (persisted per layout key). */
  showLookupPanel = true;
  toggleLookupPanel() { this.showLookupPanel = !this.showLookupPanel; }

  /**
   * Called when the seller clicks a product card in the lookup panel.
   * - If the same goods batch is already on the invoice → increment its quantity.
   * - If the last invoice row has no product yet → populate it.
   * - Otherwise → add a new row and populate it.
   */
  addProductFromLookup(goods: GoodsSearchResult) {
    // 1. Already in invoice? → bump quantity
    const existingIdx = this.selectedGoods.findIndex(g => g?.id === goods.id);
    if (existingIdx !== -1) {
      const current = +(this.items.at(existingIdx).get('quantity')?.value) || 0;
      this.items.at(existingIdx).get('quantity')?.setValue(+(current + 1).toFixed(3));
      return;
    }

    // 2. Last row is still empty → reuse it
    const lastIdx = this.items.length - 1;
    if (this.selectedGoods[lastIdx] == null) {
      this.selectProduct(lastIdx, goods);
      this.items.at(lastIdx).get('quantity')?.setValue(1);
      return;
    }

    // 3. All rows occupied → add a fresh row
    this.addItem();
    const newIdx = this.items.length - 1;
    this.selectProduct(newIdx, goods);
    this.items.at(newIdx).get('quantity')?.setValue(1);
  }

  // ── Currencies & Safes ──────────────────────────────────
  currencies: SellerCurrency[] = [];
  shopSafes:  SellerSafe[]     = [];
  initLoading = false;

  get isPhysicalSafe(): boolean {
    const safeId = this.form.get('safe_id')?.value;
    if (safeId == null) return true;
    const safe = this.shopSafes.find(s => s.id === +safeId);
    return safe?.safe_type?.kind === 'physical';
  }

  currencySymbol(id: number | null): string {
    if (!id) return '';
    return this.currencies.find(c => c.id === +id)?.symbol ?? '';
  }

  // ── Customer typeahead ──────────────────────────────────
  customerQuery = '';
  customerResults: Customer[] = [];
  showCustomerDropdown = false;
  private customerSearch$ = new Subject<string>();

  // ── Tester typeahead ────────────────────────────────────
  testerQuery = '';
  testerResults: TesterUser[] = [];
  showTesterDropdown = false;
  selectedTester: TesterUser | null = null;
  private testerSearch$ = new Subject<string>();

  // ── Header form ─────────────────────────────────────────
  form: FormGroup = this.fb.group({
    phone:        [''],
    name:         [''],
    tester_id:    [null],
    date:         [this.getToday(), Validators.required],
    price_type:   ['retail', Validators.required],
    safe_id:      [null],
    total_amount: [null, [Validators.required, Validators.min(0.01)]],
  });

  // ── Items FormArray ─────────────────────────────────────
  items: FormArray = this.fb.array([]);

  productQueries:      string[]                        = [];
  productResults:      GoodsSearchResult[][]           = [];
  showProductDropdown: boolean[]                       = [];
  selectedGoods:       (GoodsSearchResult | null)[]   = [];
  private productSearchSubjects: Subject<string>[]    = [];

  // ── Payments FormArray (for physical safe) ──────────────
  payments: FormArray = this.fb.array([]);

  // ── Totals & balance ────────────────────────────────────

  get totalAmount(): number {
    return +(this.form.get('total_amount')?.value) || 0;
  }

  /** Sum of fixed-price item totals — for display only */
  get fixedItemsTotal(): number {
    return this.selectedGoods.reduce((sum, goods, i) => {
      if (!goods?.supply_item?.product?.category?.is_fixed) return sum;
      const qty   = +(this.items.at(i)?.get('quantity')?.value) || 0;
      const price = +(goods.supply_item.product.category.minimum_sell_price ?? 0);
      return sum + qty * price;
    }, 0);
  }

  get paymentsTotal(): number {
    return this.payments.controls.reduce((sum, c) => sum + (+c.get('amount')?.value || 0), 0);
  }

  get paymentsEgpTotal(): number {
    return this.payments.controls.reduce((sum, c) => {
      const currencyId = +c.get('currency_id')?.value;
      const amount     = +c.get('amount')?.value || 0;
      const rate       = this.currencies.find(x => x.id === currencyId)?.rate ?? 0;
      return sum + amount * rate;
    }, 0);
  }

  get isPaymentBalanced(): boolean {
    if (!this.isPhysicalSafe || this.payments.length === 0) return true;
    return Math.abs(this.paymentsEgpTotal - this.totalAmount) <= 0.01;
  }

  // ── Lifecycle ───────────────────────────────────────────

  ngOnInit(): void {
    this.initLoading = true;
    forkJoin({
      currencies: this.salesService.getSellerCurrencies(),
      safes:      this.salesService.getSellerShopSafes(),
    }).subscribe({
      next: ({ currencies, safes }) => {
        this.currencies = currencies;
        this.shopSafes  = safes;
        if (this.isPhysicalSafe && this.payments.length === 0) {
          this.addPayment();
        }
        this.initLoading = false;
      },
      error: () => { this.initLoading = false; },
    });

    this.form.get('safe_id')?.valueChanges.subscribe(() => {
      if (this.isPhysicalSafe && this.payments.length === 0) {
        this.addPayment();
      } else if (!this.isPhysicalSafe) {
        while (this.payments.length) { this.payments.removeAt(0); }
      }
    });

    this.customerSearch$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q) => q.trim().length < 3 ? of([]) : this.salesService.searchCustomers(q)),
      takeUntil(this.destroy$),
    ).subscribe((results) => {
      this.customerResults = results;
      this.showCustomerDropdown = results.length > 0;
    });

    this.testerSearch$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q) => q.trim().length === 0 ? of([]) : this.salesService.searchTesters(q)),
      takeUntil(this.destroy$),
    ).subscribe((results) => {
      this.testerResults = results;
      this.showTesterDropdown = results.length > 0;
    });

    this.addItem();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.productSearchSubjects.forEach((s) => s.complete());
    this.stopPolling();
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ── Customer ────────────────────────────────────────────
  onPhoneInput(value: string) {
    this.customerQuery = value;
    this.form.get('phone')?.setValue(value);
    this.customerSearch$.next(value);
  }

  selectCustomer(customer: Customer) {
    this.customerQuery = customer.phone;
    this.form.get('phone')?.setValue(customer.phone);
    this.form.get('name')?.setValue(customer.name);
    this.showCustomerDropdown = false;
    this.customerResults = [];
  }

  closeCustomerDropdown() {
    setTimeout(() => { this.showCustomerDropdown = false; }, 200);
  }

  // ── Tester ──────────────────────────────────────────────
  onTesterInput(value: string) {
    this.testerQuery = value;
    this.selectedTester = null;
    this.form.get('tester_id')?.setValue(null);
    this.testerSearch$.next(value);
  }

  selectTester(tester: TesterUser) {
    this.selectedTester = tester;
    this.testerQuery = tester.name;
    this.form.get('tester_id')?.setValue(tester.id);
    this.showTesterDropdown = false;
    this.testerResults = [];
  }

  clearTester() {
    this.selectedTester = null;
    this.testerQuery = '';
    this.form.get('tester_id')?.setValue(null);
    this.showTesterDropdown = false;
  }

  closeTesterDropdown() {
    setTimeout(() => { this.showTesterDropdown = false; }, 200);
  }

  // ── Price type ──────────────────────────────────────────
  setPriceType(type: 'retail' | 'wholesale') {
    this.form.get('price_type')?.setValue(type);
  }

  // ── Items ───────────────────────────────────────────────
  addItem() {
    const index = this.items.length;
    const group = this.fb.group({
      product_id: [null, Validators.required],
      quantity:   [null, [Validators.required, Validators.min(0.001)]],
    });
    this.items.push(group);
    this.productQueries.push('');
    this.productResults.push([]);
    this.showProductDropdown.push(false);
    this.selectedGoods.push(null);

    const subject = new Subject<string>();
    this.productSearchSubjects.push(subject);
    subject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q) => q.trim().length === 0 ? of([]) : this.salesService.searchGoods(q)),
      takeUntil(this.destroy$),
    ).subscribe((results) => {
      this.productResults[index] = results;
      this.showProductDropdown[index] = results.length > 0;
    });
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.productQueries.splice(index, 1);
      this.productResults.splice(index, 1);
      this.showProductDropdown.splice(index, 1);
      this.selectedGoods.splice(index, 1);
      this.productSearchSubjects.splice(index, 1)[0].complete();
    }
  }

  onProductInput(index: number, value: string) {
    this.productQueries[index] = value;
    this.items.at(index).get('product_id')?.setValue(null);
    this.selectedGoods[index] = null;
    this.productSearchSubjects[index].next(value);
  }

  selectProduct(index: number, goods: GoodsSearchResult) {
    this.productQueries[index] = goods.supply_item.product.name;
    this.items.at(index).get('product_id')?.setValue(goods.supply_item.product.id);
    this.selectedGoods[index] = goods;
    this.showProductDropdown[index] = false;
    this.productResults[index] = [];
  }

  closeProductDropdown(index: number) {
    setTimeout(() => { this.showProductDropdown[index] = false; }, 200);
  }

  isQtyExceeded(_index: number): boolean {
    return false;
  }

  isFixedItem(index: number): boolean {
    return this.selectedGoods[index]?.supply_item?.product?.category?.is_fixed === true;
  }

  fixedPrice(index: number): number {
    return +(this.selectedGoods[index]?.supply_item?.product?.category?.minimum_sell_price ?? 0);
  }

  /**
   * Mirrors the backend distributeGlobalTotal() formula so the seller sees
   * a live estimate of each weighted item's unit price as they type the total.
   */
  estimatedUnitPrice(index: number): number {
    const goods = this.selectedGoods[index];
    if (!goods) return 0;
    const category = goods.supply_item?.product?.category;
    if (!category) return 0;

    // Fixed items always use minimum_sell_price
    if (category.is_fixed) return +(category.minimum_sell_price ?? 0);

    const total = this.totalAmount;
    if (total <= 0) return 0;

    // Step A: consume fixed items from the pool
    let fixedTotal = 0;
    this.selectedGoods.forEach((g, i) => {
      if (!g?.supply_item?.product?.category?.is_fixed) return;
      const qty = +(this.items.at(i)?.get('quantity')?.value) || 0;
      fixedTotal += qty * +(g.supply_item.product.category.minimum_sell_price ?? 0);
    });

    const remainingPool = total - fixedTotal;
    if (remainingPool <= 0) return 0;

    // Step B: total relative weight of all weighted items
    let totalRelative = 0;
    this.selectedGoods.forEach((g, i) => {
      if (!g || g.supply_item?.product?.category?.is_fixed) return;
      const qty = +(this.items.at(i)?.get('quantity')?.value) || 0;
      const pct = +(g.supply_item?.product?.category?.value_percentage ?? 0) / 100;
      totalRelative += qty * pct;
    });

    if (totalRelative === 0) return 0;

    // Step C: this item's share → unit price
    const myQty = +(this.items.at(index)?.get('quantity')?.value) || 0;
    const myPct = +(category.value_percentage ?? 0) / 100;
    const myRelative = myQty * myPct;
    const share = (myRelative / totalRelative) * remainingPool;
    return myQty > 0 ? share / myQty : 0;
  }

  /** True when a weighted item's estimated price falls below the category minimum. */
  isPriceWarning(index: number): boolean {
    const goods = this.selectedGoods[index];
    if (!goods) return false;
    const category = goods.supply_item?.product?.category;
    if (!category || category.is_fixed) return false;
    if (!this.totalAmount) return false;
    const estimated = this.estimatedUnitPrice(index);
    const minPrice  = +(category.minimum_sell_price ?? 0);
    return minPrice > 0 && estimated < minPrice;
  }

  // ── Override request flow ────────────────────────────────

  get hasViolations(): boolean {
    return this.selectedGoods.some((_, i) => this.isPriceWarning(i));
  }

  collectViolations(): OverrideViolation[] {
    return this.selectedGoods
      .map((goods, i) => {
        if (!goods || !this.isPriceWarning(i)) return null;
        const category = goods.supply_item.product.category!;
        return {
          product_name:    goods.supply_item.product.name,
          category_name:   category.name ?? '',
          estimated_price: +this.estimatedUnitPrice(i).toFixed(4),
          minimum_price:   +(category.minimum_sell_price ?? 0),
        } satisfies OverrideViolation;
      })
      .filter((v): v is OverrideViolation => v !== null);
  }

  submitOverrideRequest(): void {
    const violations = this.collectViolations();
    if (!violations.length || !this.overrideJustification.trim()) return;
    this.overrideSubmitting = true;

    this.overrideService.submitRequest(violations, this.overrideJustification).subscribe({
      next: (res) => {
        this.overrideRequestId  = res.id;
        this.overrideState      = 'polling';
        this.overrideSubmitting = false;
        this.startPolling();
      },
      error: (err) => {
        this.overrideSubmitting = false;
        this.alert = { show: true, type: 'error', message: err?.error?.message ?? 'فشل إرسال طلب الموافقة.' };
      },
    });
  }

  private startPolling(): void {
    this.stopPolling();
    this.overridePollingInterval = setInterval(() => {
      if (!this.overrideRequestId) return;
      this.overrideService.pollStatus(this.overrideRequestId).subscribe({
        next: (res) => {
          if (res.status === 'approved') {
            this.overrideToken = res.token ?? null;
            this.overrideState = 'approved';
            this.stopPolling();
          } else if (res.status === 'rejected') {
            this.overrideRejectionNote = res.manager_note ?? '';
            this.overrideState         = 'rejected';
            this.stopPolling();
          }
        },
      });
    }, 5_000);
  }

  private stopPolling(): void {
    if (this.overridePollingInterval) {
      clearInterval(this.overridePollingInterval);
      this.overridePollingInterval = null;
    }
  }

  cancelOverrideRequest(): void {
    this.stopPolling();
    this.overrideRequestId     = null;
    this.overrideToken         = null;
    this.overrideJustification = '';
    this.overrideRejectionNote = '';
    this.overrideState         = 'none';
  }

  // ── Payments ────────────────────────────────────────────
  addPayment() {
    const defaultCurrency = this.currencies.find(c => c.code === 'EGP') ?? this.currencies[0];
    this.payments.push(this.fb.group({
      currency_id: [defaultCurrency?.id ?? null, Validators.required],
      amount:      [null, [Validators.required, Validators.min(0.01)]],
    }));
  }

  removePayment(index: number) {
    if (this.payments.length > 1) {
      this.payments.removeAt(index);
    }
  }

  fillPaymentFromTotal() {
    const egp = this.currencies.find(c => c.code === 'EGP');
    if (!egp) return;
    if (this.payments.length === 0) { this.addPayment(); }
    const first = this.payments.at(0);
    first.get('currency_id')?.setValue(egp.id);
    first.get('amount')?.setValue(+(this.totalAmount.toFixed(2)));
  }

  // ── Submit ──────────────────────────────────────────────
  onSubmit() {
    this.form.markAllAsTouched();
    this.items.controls.forEach((c) => (c as FormGroup).markAllAsTouched());
    this.payments.controls.forEach((c) => (c as FormGroup).markAllAsTouched());

    if (this.form.invalid) {
      const missing: string[] = [];
      if (this.form.get('date')?.invalid)         missing.push('التاريخ');
      if (this.form.get('total_amount')?.invalid)  missing.push('إجمالي الفاتورة');
      this.alert = { show: true, type: 'error', message: `يرجى ملء الحقول المطلوبة: ${missing.join('، ')}.` };
      return;
    }

    if (this.items.invalid) {
      this.alert = { show: true, type: 'error', message: 'يرجى التأكد من اختيار المنتج وإدخال الكمية لجميع الأصناف.' };
      return;
    }

    if (this.isPhysicalSafe && this.payments.invalid) {
      this.alert = { show: true, type: 'error', message: 'يرجى إدخال تفاصيل الدفع المستلم (العملة والمبلغ) لكل صف.' };
      return;
    }

    if (this.isPhysicalSafe && this.payments.length === 0) {
      this.alert = { show: true, type: 'error', message: 'يرجى إضافة طريقة دفع واحدة على الأقل.' };
      return;
    }

    // Check for price violations — require manager override first
    if (this.hasViolations && this.overrideState !== 'approved') {
      this.overrideState = 'needed';
      return;
    }

    const fv = this.form.value;
    const payload: any = {
      phone:        fv.phone      || '',
      name:         fv.name       || '',
      tester_id:    fv.tester_id,
      date:         fv.date,
      price_type:   fv.price_type,
      safe_id:      fv.safe_id ? +fv.safe_id : null,
      total_amount: +fv.total_amount,
      payments: this.isPhysicalSafe
        ? this.payments.value.map((p: any) => ({ currency_id: +p.currency_id, amount: +p.amount }))
        : [],
      items: this.items.value.map((item: any) => ({
        product_id: item.product_id,
        quantity:   item.quantity,
      })),
    };
    if (this.overrideToken) {
      payload.override_token = this.overrideToken;
    }

    this.doSubmit(payload);
  }

  private doSubmit(payload: any) {
    this.isSubmitting = true;
    this.alert = { show: false, type: '', message: '' };

    this.salesService.createInvoice(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        const invoice = res?.data?.invoice ?? res?.data;
        this.lastInvoice     = invoice;
        this.showReceiptModal = true;
        this.resetForm();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.' };
      },
    });
  }

  private resetForm() {
    this.cancelOverrideRequest();
    this.customerQuery = '';
    this.testerQuery = '';
    this.selectedTester = null;
    this.form.reset({ phone: '', name: '', tester_id: null, date: this.getToday(), price_type: 'retail', safe_id: null, total_amount: null });
    while (this.items.length) { this.items.removeAt(0); }
    while (this.payments.length) { this.payments.removeAt(0); }
    this.productSearchSubjects.forEach((s) => s.complete());
    this.productQueries = [];
    this.productResults = [];
    this.showProductDropdown = [];
    this.selectedGoods = [];
    this.productSearchSubjects = [];
    this.addItem();
    if (this.isPhysicalSafe) { this.addPayment(); }
  }
}
