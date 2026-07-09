import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { SalesService } from '../../services/sales.service';
import { OverrideService, OverrideViolation } from '../../services/override.service';
import { Customer, GoodsSearchResult, PAYMENT_METHODS } from '../../models/sales.model';
import { InvoiceReceiptComponent } from './invoice-receipt/invoice-receipt.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { LabelComponent } from '../../shared/components/form/label/label.component';
import { ComponentCardComponent } from '../../shared/components/common/component-card/component-card.component';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { ProductLookupPanelComponent } from './product-lookup-panel/product-lookup-panel.component';

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

  // ── Header form ─────────────────────────────────────────
  form: FormGroup = this.fb.group({
    phone:        [''],
    name:         [''],
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

  // ── Compose (BOM) modal ──────────────────────────────────
  showComposeModal = false;
  composeRows: { product_id: number | null; name: string; sku: string | null; unit: string; quantity: number | null; price: number | null; stock: number }[] = [];
  composeAddQuery = '';
  composeAddResults: GoodsSearchResult[] = [];
  showComposeAddDropdown = false;
  private composeAddSearch$ = new Subject<string>();
  composeRecipeQuery = '';
  composeRecipeResults: { id: number; name: string; sku?: string }[] = [];
  showComposeRecipeDropdown = false;
  private composeRecipeSearch$ = new Subject<string>();

  openCompose() { this.showComposeModal = true; }
  closeCompose() { this.showComposeModal = false; }

  onComposeAddInput(v: string) { this.composeAddQuery = v; this.composeAddSearch$.next(v); }
  onComposeRecipeInput(v: string) { this.composeRecipeQuery = v; this.composeRecipeSearch$.next(v); }

  /** Add a component row from a product search result (ad-hoc). */
  addComponent(goods: GoodsSearchResult) {
    this.composeRows.push({
      product_id: goods.supply_item.product.id,
      name:       goods.supply_item.product.name,
      sku:        goods.supply_item.product.sku ?? null,
      unit:       goods.unit ?? goods.supply_item.product.scalar ?? '',
      quantity:   1,
      price:      goods.configured_unit_price ?? null,
      stock:      goods.product_shop_stock ?? 0,
    });
    this.composeAddQuery = ''; this.composeAddResults = []; this.showComposeAddDropdown = false;
  }

  /** Load a product's saved recipe (BOM) into the component rows. */
  loadRecipe(product: { id: number; name: string }) {
    const pid = product.id;
    this.composeRecipeQuery = product.name;
    this.showComposeRecipeDropdown = false; this.composeRecipeResults = [];
    this.salesService.getProductComponents(pid).subscribe({
      next: (comps) => {
        if (!comps.length) {
          this.alert = { show: true, type: 'error', message: 'هذا المنتج ليس له وصفة مكوّنات محفوظة.' };
          return;
        }
        for (const c of comps) {
          this.composeRows.push({
            product_id: c.component_product_id, name: c.name, sku: c.sku, unit: c.unit,
            quantity: c.quantity, price: c.configured_unit_price ?? null, stock: c.shop_stock ?? 0,
          });
        }
      },
    });
  }

  removeComposeRow(i: number) { this.composeRows.splice(i, 1); }

  get composeTotal(): number {
    return this.composeRows.reduce((s, r) => s + (+(r.quantity ?? 0)) * (+(r.price ?? 0)), 0);
  }

  /** Add all composed component rows to the invoice as editable lines. */
  applyCompose() {
    const rows = this.composeRows.filter(r => r.product_id && +(r.quantity ?? 0) > 0);
    for (const r of rows) {
      this.addComposedLine(r);
    }
    this.composeRows = [];
    this.closeCompose();
  }

  private addComposedLine(r: any) {
    // Synthetic goods object so the invoice line carries stock / unit / price.
    const goods: any = {
      id: -Math.floor(Math.random() * 1e9),
      product_shop_stock: r.stock,
      configured_unit_price: r.price,
      unit: r.unit,
      supply_item: { product: { id: r.product_id, name: r.name, sku: r.sku, scalar: r.unit } },
    };
    // Reuse the last empty row, otherwise add a fresh one.
    let idx = this.items.length - 1;
    if (idx < 0 || this.selectedGoods[idx] != null) {
      this.addItem();
      idx = this.items.length - 1;
    }
    this.productQueries[idx] = r.name;
    this.items.at(idx).get('product_id')?.setValue(r.product_id);
    this.items.at(idx).get('quantity')?.setValue(r.quantity);
    this.items.at(idx).get('price')?.setValue(r.price);
    this.selectedGoods[idx] = goods;
    this.syncComputedTotal();
  }

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

  // ── Pricing engine: new per-item (default) vs legacy Global Total ─────────
  /** Cashier-selected mode. 'auto' uses per-item pricing when every item is
   *  configured; 'global' always uses the manual Global-Total workflow. */
  pricingMode: 'auto' | 'global' = 'auto';

  setPricingMode(mode: 'auto' | 'global') {
    this.pricingMode = mode;
    this.syncComputedTotal();
  }

  /** The editable unit price for a row (prefilled from config, overridable). */
  lineUnitPrice(i: number): number {
    return +(this.items.at(i)?.get('price')?.value) || 0;
  }

  /** Whether a row has a usable unit price (typed or prefilled). */
  itemConfigured(i: number): boolean {
    return this.lineUnitPrice(i) > 0;
  }

  /** The selling unit for a row (g / pcs) — comes from the Product Type. */
  itemUnit(i: number): string {
    return this.selectedGoods[i]?.unit
        ?? this.selectedGoods[i]?.supply_item?.product?.scalar
        ?? '';
  }

  /** Line total = quantity × configured unit price. */
  lineTotal(i: number): number {
    return (+(this.items.at(i)?.get('quantity')?.value) || 0) * this.lineUnitPrice(i);
  }

  /** Remaining shop stock for a row's product (from the goods payload). */
  stockAvailable(i: number): number {
    return +(this.selectedGoods[i]?.product_shop_stock ?? 0);
  }

  /** The requested quantity exceeds the available shop stock. */
  exceedsStock(i: number): boolean {
    const goods = this.selectedGoods[i];
    if (!goods) return false;
    const qty = +(this.items.at(i)?.get('quantity')?.value) || 0;
    return qty > this.stockAvailable(i);
  }

  /** Any row requests more than what's in stock → block the sale. */
  get hasStockError(): boolean {
    return this.selectedGoods.some((g, i) => g != null && this.exceedsStock(i));
  }

  /** Every selected row is configured (and there is at least one). */
  get allItemsConfigured(): boolean {
    const rows = this.selectedGoods.filter(g => g != null);
    return rows.length > 0 && rows.every(g => g?.configured_unit_price != null);
  }

  /** Per-item pricing active (default). Global mode is the manual-total fallback. */
  get useNewEngine(): boolean {
    return this.pricingMode === 'auto';
  }

  /** Automatic invoice total = Σ (quantity × editable line price). */
  get computedTotal(): number {
    return this.selectedGoods.reduce((sum, g, i) => sum + (g ? this.lineTotal(i) : 0), 0);
  }

  /** Mirror the computed total into the form so payments/balance logic reuses it. */
  private syncComputedTotal(): void {
    if (this.pricingMode === 'auto') {
      this.form.get('total_amount')?.setValue(+this.computedTotal.toFixed(2), { emitEvent: false });
    }
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

    // Recompute the automatic invoice total whenever quantities change.
    this.items.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncComputedTotal());

    // Compose modal — add-component + load-recipe searches.
    this.composeAddSearch$.pipe(
      debounceTime(350), distinctUntilChanged(),
      switchMap((q) => q.trim().length === 0 ? of([]) : this.salesService.searchGoods(q)),
      takeUntil(this.destroy$),
    ).subscribe((results) => { this.composeAddResults = results; this.showComposeAddDropdown = results.length > 0; });

    this.composeRecipeSearch$.pipe(
      debounceTime(350), distinctUntilChanged(),
      switchMap((q) => q.trim().length === 0 ? of([]) : this.salesService.searchComposableProducts(q)),
      takeUntil(this.destroy$),
    ).subscribe((results) => { this.composeRecipeResults = results; this.showComposeRecipeDropdown = results.length > 0; });

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
      // Editable unit price — prefilled from the configured price, overridable.
      price:      [null, [Validators.min(0)]],
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
      this.syncComputedTotal();
    }
  }

  onProductInput(index: number, value: string) {
    this.productQueries[index] = value;
    this.items.at(index).get('product_id')?.setValue(null);
    this.selectedGoods[index] = null;
    this.productSearchSubjects[index].next(value);
    this.syncComputedTotal();
  }

  selectProduct(index: number, goods: GoodsSearchResult) {
    this.productQueries[index] = goods.supply_item.product.name;
    this.items.at(index).get('product_id')?.setValue(goods.supply_item.product.id);
    this.selectedGoods[index] = goods;
    this.showProductDropdown[index] = false;
    this.productResults[index] = [];
    // Prefill the editable unit price from the product's configured price.
    const priceCtrl = this.items.at(index).get('price');
    if (priceCtrl && (priceCtrl.value == null || priceCtrl.value === '')) {
      priceCtrl.setValue(goods.configured_unit_price ?? null);
    }
    this.syncComputedTotal();
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
  /** Payment method options for the dropdown (mirror of backend enum). */
  readonly paymentMethods = PAYMENT_METHODS;

  /** Whether the given payment row's method requires a transaction number. */
  methodNeedsTxn(payment: AbstractControl): boolean {
    const method = payment.get('payment_method')?.value;
    return this.paymentMethods.find(m => m.value === method)?.requiresTransactionNumber ?? false;
  }

  addPayment() {
    const defaultCurrency = this.currencies.find(c => c.code === 'EGP') ?? this.currencies[0];
    const group = this.fb.group({
      currency_id:        [defaultCurrency?.id ?? null, Validators.required],
      amount:             [null, [Validators.required, Validators.min(0.01)]],
      payment_method:     ['cash', Validators.required],
      transaction_number: [''],
    });

    // Transaction number is required only for methods that need it (e.g. visa).
    // Toggle the validator dynamically as the method changes.
    group.get('payment_method')?.valueChanges.subscribe((method) => {
      const txn = group.get('transaction_number');
      const needs = this.paymentMethods.find(m => m.value === method)?.requiresTransactionNumber ?? false;
      if (needs) {
        txn?.setValidators([Validators.required, Validators.maxLength(100)]);
      } else {
        txn?.clearValidators();
        txn?.setValue('');
      }
      txn?.updateValueAndValidity();
    });

    this.payments.push(group);
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

    // In per-item mode, every line must have a unit price.
    if (this.useNewEngine) {
      const missing = this.selectedGoods.findIndex((g, idx) => g != null && this.lineUnitPrice(idx) <= 0);
      if (missing !== -1) {
        const name = this.selectedGoods[missing]?.supply_item?.product?.name ?? '';
        this.alert = { show: true, type: 'error', message: `يرجى إدخال سعر الوحدة للصنف "${name}".` };
        return;
      }
    }

    // Never sell more than what's in stock.
    if (this.hasStockError) {
      const i = this.selectedGoods.findIndex((g, idx) => g != null && this.exceedsStock(idx));
      const name = this.selectedGoods[i]?.supply_item?.product?.name ?? '';
      this.alert = {
        show: true, type: 'error',
        message: `الكمية المطلوبة من "${name}" أكبر من المتاح في المخزون (${this.stockAvailable(i)} ${this.itemUnit(i)}). لا يمكن إتمام البيع.`,
      };
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

    // The legacy client-side violation/override flow only applies to the
    // Global-Total engine. Under the new per-item engine the price is fixed by
    // configuration, so the backend enforces the floor and notifies directly.
    if (!this.useNewEngine && this.hasViolations && this.overrideState !== 'approved') {
      this.overrideState = 'needed';
      return;
    }

    const fv = this.form.value;
    const payload: any = {
      phone:        fv.phone      || '',
      name:         fv.name       || '',
      date:         fv.date,
      price_type:   fv.price_type,
      safe_id:      fv.safe_id ? +fv.safe_id : null,
      // New engine → computed total; Global Total → the entered amount.
      total_amount: this.useNewEngine ? +this.computedTotal.toFixed(2) : +fv.total_amount,
      pricing_mode: this.useNewEngine ? 'auto' : 'global',
      payments: this.isPhysicalSafe
        ? this.payments.value.map((p: any) => ({
            currency_id:        +p.currency_id,
            amount:             +p.amount,
            payment_method:     p.payment_method,
            transaction_number: p.payment_method === 'cash' ? null : (p.transaction_number?.trim() || null),
          }))
        : [],
      items: this.items.value.map((item: any) => ({
        product_id: item.product_id,
        quantity:   item.quantity,
        // Send the editable unit price so the backend uses it (no distribution).
        price:      (item.price === null || item.price === '') ? null : +item.price,
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
    this.form.reset({ phone: '', name: '', date: this.getToday(), price_type: 'retail', safe_id: null, total_amount: null });
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
