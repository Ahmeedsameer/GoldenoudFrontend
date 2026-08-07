import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { SalesService } from '../../services/sales.service';
import { OverrideService, OverrideViolation } from '../../services/override.service';
import { CARD_PAYMENT_TYPES, Customer, GoodsSearchResult, PaymentMethod } from '../../models/sales.model';
import { InvoiceReceiptComponent } from './invoice-receipt/invoice-receipt.component';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { LabelComponent } from '../../shared/components/form/label/label.component';
import { ComponentCardComponent } from '../../shared/components/common/component-card/component-card.component';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { ComposedLine } from './catalog-sell-dialog/catalog-sell-dialog.component';
import { SearchBarComponent } from '../../shared/components/common/search-bar/search-bar.component';
import { SalesCatalogComponent } from '../../shared/components/sales-catalog/sales-catalog.component';
import { CustomerFormComponent } from '../../shared/components/customer-form/customer-form.component';
import { CustomerService } from '../../services/customer.service';
import { ActivatedRoute } from '@angular/router';

export interface SellerCurrency { id: number; code: string; name: string; symbol: string; rate: number; }
export interface SellerSafe    { id: number; safe_type: { name: string; kind: string }; }
export interface CatalogProduct {
  id: number; name: string; sku: string | null; image?: string | null;
  product_type: 'COMPOUND' | 'READY_PRODUCT' | string | null;
  configured_unit_price: number | null; shop_stock: number | null; unit: string;
  /** Composite Products only — a preferred oil to pre-select (never lock) in the Assemble-on-Sale dialog. */
  default_oil_id?: number | null;
  /** Composite Products only — whether the shop currently has at least one
   *  priced, in-stock oil AND bottle (shop-wide, since the Builder allows any
   *  combination — there's no fixed recipe to check stock against). */
  compound_available?: boolean | null;
  compound_unavailable_reason?: string | null;
}

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
    FormsModule,
    InvoiceReceiptComponent,
    SearchBarComponent,
    SalesCatalogComponent,
    CustomerFormComponent,
  ],
  templateUrl: './cashier.component.html',
  styleUrl: './cashier.component.css',
})
export class CashierComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private salesService   = inject(SalesService);
  private overrideService = inject(OverrideService);
  private customerService = inject(CustomerService);
  private route = inject(ActivatedRoute);
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

  // ── Customer typeahead — searches by name OR phone (either field can drive it) ──
  customerQuery = '';
  customerResults: Customer[] = [];
  showCustomerDropdown = false;
  /** True once a search has actually completed with zero matches — only then
   *  do we offer "add new customer" (never while the field is simply empty). */
  customerSearchedNoResults = false;
  private customerSearch$ = new Subject<string>();

  // ── Quick-create customer (cashier, no need to leave the page) ──────────
  showQuickAddCustomer = false;
  quickAddCustomer = { name: '', phone: '', email: '', address: '' };
  quickAddCustomerLoading = false;
  quickAddCustomerError = '';

  // ── Header form ─────────────────────────────────────────
  form: FormGroup = this.fb.group({
    phone:        [''],
    name:         [''],
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

  /** Client-only bookkeeping for manufactured-perfume rows (never sent to the
   *  backend) — parallel to selectedGoods/productQueries. compositionKeys[i]
   *  is the shared token for the 3 real rows (oil/alcohol/bottle) of ONE
   *  manufacturing operation; parentNames[i] is the perfume's own name, used
   *  to relabel the visible (bottle) row. See isHiddenMaterialRow()/
   *  compositionGroup() below for how these collapse 3 rows into 1 in the UI. */
  compositionKeys: (string | null)[] = [];
  parentNames:     (string | null)[] = [];

  // ── Payments FormArray (for physical safe) ──────────────
  payments: FormArray = this.fb.array([]);

  /** Shared by every path that drops a resolved line onto the invoice —
   *  the catalog's direct-add (Ready Product) and the Product Builder's
   *  oil+bottle+alcohol trio (Compound Product). */
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
    this.items.at(idx).get('parent_product_id')?.setValue(r.parent_product_id ?? null);
    this.items.at(idx).get('role')?.setValue(r.role ?? null);
    this.selectedGoods[idx] = goods;
    this.compositionKeys[idx] = r.composition_key ?? null;
    this.parentNames[idx] = r.parent_name ?? null;
    this.syncComputedTotal();
  }

  // ── Barcode scanner ───────────────────────────────────────────────────────
  // A standard USB/BT barcode scanner behaves like a keyboard — it types the
  // code into whatever field has focus, then sends Enter. A plain text input
  // bound with (keyup.enter) already handles that natively; no custom
  // keystroke-buffering/global listener is needed.
  @ViewChild('barcodeInput') private barcodeInputRef?: ElementRef<HTMLInputElement>;

  barcodeValue = '';
  barcodeLoading = false;

  /** Codes scanned while a previous lookup is still in flight — never
   *  dropped, just processed one at a time once the current lookup
   *  finishes. Necessary because two overlapping lookups for the SAME
   *  product could otherwise both read the pre-increment quantity and
   *  collapse into a single +1 instead of +2 (a lost-update race) — running
   *  them strictly one-at-a-time makes that structurally impossible while
   *  still never losing a scan the cashier fired off quickly. */
  private barcodeQueue: string[] = [];

  ngAfterViewInit(): void {
    this.focusBarcodeInput();
  }

  private focusBarcodeInput(): void {
    // Deferred a tick so it runs after the current change-detection cycle —
    // calling .focus() synchronously right after clearing the value can lose
    // to Angular's own DOM update in some browsers.
    setTimeout(() => this.barcodeInputRef?.nativeElement.focus(), 0);
  }

  /** Fires on Enter — exactly when a scanner (or a cashier typing a code by
   *  hand) finishes sending the barcode. The field is cleared and refocused
   *  immediately regardless of queue state, so the cashier can keep scanning
   *  at full speed with no visible delay; the actual lookups just resolve
   *  serially behind the scenes. */
  onBarcodeScan(): void {
    const code = this.barcodeValue.trim();
    this.barcodeValue = '';
    this.focusBarcodeInput();
    if (!code) return;

    this.barcodeQueue.push(code);
    this.processBarcodeQueue();
  }

  private processBarcodeQueue(): void {
    if (this.barcodeLoading || this.barcodeQueue.length === 0) return;

    const code = this.barcodeQueue.shift()!;
    this.barcodeLoading = true;

    this.salesService.findGoodsByBarcode(code).subscribe({
      next: ({ status, data }) => {
        this.barcodeLoading = false;

        if (status === 'ambiguous') {
          this.alert = { show: true, type: 'error', message: `أكثر من منتج مسجَّل بنفس الباركود "${code}" — راجع بيانات المنتجات.` };
        } else if (status === 'not_found' || !data) {
          this.alert = { show: true, type: 'error', message: `لم يتم العثور على منتج بالباركود "${code}".` };
        } else {
          // Covers every outcome inside addOrIncrementFromBarcode too — found
          // + added, found + quantity incremented, missing price, or exceeds
          // stock — all converge back here before the queue/focus continue.
          this.addOrIncrementFromBarcode(data);
        }

        // Regain focus after EVERY outcome — success, not found, ambiguous,
        // missing price, or exceeds stock — so the cashier never has to
        // click the field again mid-shift.
        this.focusBarcodeInput();
        this.processBarcodeQueue();
      },
      error: () => {
        this.barcodeLoading = false;
        this.alert = { show: true, type: 'error', message: `تعذّر البحث عن الباركود "${code}".` };
        this.focusBarcodeInput();
        this.processBarcodeQueue();
      },
    });
  }

  /** If this product is already a plain (non-composed) line on the invoice,
   *  bump its quantity by 1 — same stock/price rules apply automatically
   *  since it's the same reactive form control exceedsStock()/hasStockError
   *  already watch. Otherwise adds a new line via the same addComposedLine()
   *  every catalog-card click already goes through. */
  private addOrIncrementFromBarcode(goods: GoodsSearchResult): void {
    const product = goods.supply_item.product;

    if (goods.configured_unit_price == null) {
      this.alert = { show: true, type: 'error', message: `${product.name} ليس له سعر بيع محدد — أكمل إدارة الأسعار أولاً.` };
      return;
    }

    const existingIdx = this.items.controls.findIndex((_, i) =>
      !this.compositionKeys[i] &&
      this.items.at(i).get('product_id')?.value === product.id
    );

    if (existingIdx >= 0) {
      const qtyCtrl = this.items.at(existingIdx).get('quantity');
      const newQty = (+(qtyCtrl?.value) || 0) + 1;
      if (newQty > this.stockAvailable(existingIdx)) {
        this.alert = {
          show: true, type: 'error',
          message: `الكمية المطلوبة من "${product.name}" أكبر من المتاح في المخزون (${this.stockAvailable(existingIdx)} ${this.itemUnit(existingIdx)}). لا يمكن إتمام البيع.`,
        };
        return;
      }
      qtyCtrl?.setValue(newQty);
      this.syncComputedTotal();
      return;
    }

    if ((goods.product_shop_stock ?? 0) <= 0) {
      this.alert = { show: true, type: 'error', message: `${product.name} نفد من المخزون في هذا الفرع — يحتاج توريد.` };
      return;
    }

    this.addComposedLine({
      product_id: product.id, name: product.name, sku: product.sku, unit: goods.unit ?? product.scalar,
      quantity: 1, price: goods.configured_unit_price, stock: goods.product_shop_stock ?? 0,
      parent_product_id: null, role: null,
    });
  }

  // ── Sales Catalog — always visible, no button-gating ─────────────────────
  // "When I open the Sales screen, I see the Catalog" — this is the default,
  // primary view, not a secondary action hidden behind a button/modal.
  // The actual browse/search/pick UI lives in <app-sales-catalog> (shared
  // with Edit Invoice) — this component only reacts to what was picked.

  /**
   * A Ready Product card was picked — added directly to the invoice
   * immediately, exactly as before (SalesCatalogComponent already blocked
   * this for out-of-stock/no-price products before emitting).
   */
  onCatalogProductSelected(p: CatalogProduct) {
    this.addComposedLine({
      product_id: p.id, name: p.name, sku: p.sku, unit: p.unit,
      quantity: 1, price: p.configured_unit_price ?? 0, stock: p.shop_stock ?? 0,
      parent_product_id: null, role: null,
    });
  }

  /** Emitted by <app-sales-catalog> once the seller confirms oil+bottle in
   *  the Product Builder. The 3 real rows (oil/alcohol/bottle) share
   *  line.composition_key so the cart can collapse them into ONE visible
   *  manufactured-perfume row (see isHiddenMaterialRow()/compositionGroup()
   *  below). */
  onCatalogCompositionAdded(event: { perfumeName: string; lines: ComposedLine[] }) {
    for (const line of event.lines) {
      this.addComposedLine({
        product_id: line.product_id, name: line.name, sku: line.sku, unit: line.unit,
        quantity: line.quantity, price: line.price, stock: line.stock,
        parent_product_id: line.parent_product_id, role: line.role,
        composition_key: line.composition_key, parent_name: event.perfumeName,
      });
    }
  }

  onCatalogPickError(message: string) {
    this.alert = { show: true, type: 'error', message };
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

  /** The composition role of a row ('oil' | 'bottle' | 'alcohol' | null). */
  lineRole(i: number): string | null {
    return this.items.at(i)?.get('role')?.value ?? null;
  }

  /** Whether a row has a usable unit price. Alcohol is the sole exception:
   *  its price is deliberately always 0 (operational material, never charged
   *  to the customer — see catalog-sell-dialog's addToInvoice), so a zero
   *  price there is valid/configured, not missing. Oil and Bottle always
   *  carry their real configured price and must be > 0. */
  itemConfigured(i: number): boolean {
    return this.lineUnitPrice(i) > 0 || this.lineRole(i) === 'alcohol';
  }

  // ── Manufactured-perfume row collapsing ──────────────────────────────────
  // The Product Builder still emits 3 real rows (oil/alcohol/bottle) — FIFO,
  // the stock guard and the invoice engine all need them exactly as before.
  // These helpers only change what the CASHIER SEES: oil/alcohol rows are
  // hidden, and the bottle row is relabeled/re-priced to represent "the
  // finished perfume" as one logical line, per parent_product_id via a
  // shared composition_key (see catalog-sell-dialog's addToInvoice()).

  /** All row indices belonging to the same manufacturing operation as `i`. */
  private compositionGroupIndices(i: number): number[] {
    const key = this.compositionKeys[i];
    if (!key) return [i];
    const idxs: number[] = [];
    this.compositionKeys.forEach((k, idx) => { if (k === key) idxs.push(idx); });
    return idxs;
  }

  private compositionGroup(i: number): { oilIdx: number | null; alcoholIdx: number | null; bottleIdx: number } | null {
    if (!this.compositionKeys[i]) return null;
    const idxs = this.compositionGroupIndices(i);
    const oilIdx = idxs.find((idx) => this.lineRole(idx) === 'oil') ?? null;
    const alcoholIdx = idxs.find((idx) => this.lineRole(idx) === 'alcohol') ?? null;
    const bottleIdx = idxs.find((idx) => this.lineRole(idx) === 'bottle');
    return bottleIdx === undefined ? null : { oilIdx, alcoholIdx, bottleIdx };
  }

  /** Oil/Alcohol rows of a manufactured perfume are never rendered — only
   *  the Bottle row (relabeled as the perfume) is shown to the cashier. */
  isHiddenMaterialRow(i: number): boolean {
    if (!this.compositionKeys[i]) return false;
    const role = this.lineRole(i);
    return role === 'oil' || role === 'alcohol';
  }

  /** The perfume's own name, for the one visible row of a manufacturing
   *  operation — null for every ordinary (non-manufactured) row. */
  manufacturedName(i: number): string | null {
    return this.compositionKeys[i] ? this.parentNames[i] : null;
  }

  /** Manufacturing Quantity for this operation (the Bottle row's own quantity). */
  manufacturedQty(i: number): number {
    const g = this.compositionGroup(i);
    const idx = g ? g.bottleIdx : i;
    return +(this.items.at(idx)?.get('quantity')?.value) || 0;
  }

  /** Total revenue for the whole manufacturing operation — Oil's real price
   *  (fixed) + Bottle's price (real by default, freely editable) — Alcohol
   *  never contributes (always 0). Falls back to the row's own lineTotal for
   *  an ordinary (non-grouped) row. */
  manufacturedLineTotal(i: number): number {
    const g = this.compositionGroup(i);
    if (!g) return this.lineTotal(i);
    const oilRevenue = g.oilIdx != null ? this.lineTotal(g.oilIdx) : 0;
    return oilRevenue + this.lineTotal(g.bottleIdx);
  }

  /** The perfume's effective "selling price" shown on its one visible row —
   *  auto-resolved from Pricing Management by default (Oil's real price
   *  contribution + Bottle's real price), and freely editable afterward. */
  manufacturedUnitPrice(i: number): number {
    const qty = this.manufacturedQty(i);
    return qty > 0 ? +(this.manufacturedLineTotal(i) / qty).toFixed(2) : 0;
  }

  /** Cashier edits the perfume's visible price — exactly like editing any
   *  other product's price. Under the hood this can only ever adjust the
   *  hidden Bottle row's price; Oil's real configured price is never
   *  touched, so "Oil must keep its real price" holds even after an edit. */
  setManufacturedUnitPrice(i: number, newUnitPrice: number): void {
    const g = this.compositionGroup(i);
    if (!g) return;
    const qty = this.manufacturedQty(i);
    if (qty <= 0) return;
    const oilRevenue = g.oilIdx != null ? this.lineTotal(g.oilIdx) : 0;
    const newBottlePrice = Math.max(0, ((+newUnitPrice || 0) * qty - oilRevenue) / qty);
    this.items.at(g.bottleIdx)?.get('price')?.setValue(+newBottlePrice.toFixed(2));
  }

  /** Number of rows the cashier actually SEES — hidden oil/alcohol rows of a
   *  manufactured perfume don't count (used for "عدد الأصناف"). */
  get visibleItemCount(): number {
    return this.items.controls.filter((_, i) => !this.isHiddenMaterialRow(i)).length;
  }

  /** Removes a whole manufacturing operation (all 3 rows) in one action when
   *  `i` belongs to one; otherwise identical to removing a single ordinary row. */
  removeComposedRow(i: number): void {
    if (!this.compositionKeys[i]) { this.removeItem(i); return; }
    const idxs = this.compositionGroupIndices(i).sort((a, b) => b - a);
    for (const idx of idxs) {
      this.items.removeAt(idx);
      this.productQueries.splice(idx, 1);
      this.productResults.splice(idx, 1);
      this.showProductDropdown.splice(idx, 1);
      this.selectedGoods.splice(idx, 1);
      this.compositionKeys.splice(idx, 1);
      this.parentNames.splice(idx, 1);
      this.productSearchSubjects.splice(idx, 1)[0]?.complete();
    }
    if (this.items.length === 0) { this.addItem(); }
    this.syncComputedTotal();
  }

  /** Profit as a % of the invoice's items total — "الهامش %" tile. */
  get marginPercent(): number | null {
    if (this.cartItemsTotal <= 0) return null;
    return +((this.expectedProfit / this.cartItemsTotal) * 100).toFixed(1);
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

  /** Automatic invoice total = Σ (quantity × editable line price). Both
   *  pricing modes ("أسعار الأصناف" and "إجمالي يدوي"/Manual Total) price
   *  every line directly and compute the invoice total this way — the only
   *  remaining difference is WHERE the price comes from by default
   *  (pre-filled config vs always manual) and whether the price-floor
   *  override flow applies (see onSubmit()/isPriceWarning()). */
  get computedTotal(): number {
    return this.selectedGoods.reduce((sum, g, i) => sum + (g ? this.lineTotal(i) : 0), 0);
  }

  /** Mirror the computed total into the form so payments/balance logic reuses it.
   *  The invoice total is always computed (Σ qty × price) — never manually
   *  typed, in either pricing mode. */
  private syncComputedTotal(): void {
    this.form.get('total_amount')?.setValue(+this.computedTotal.toFixed(2), { emitEvent: false });
  }

  // ── Live cost summary (Part 2) ───────────────────────────────────────────
  /** Real FIFO cost of the current cart, fetched from the same batch-drain
   *  order the sale itself will use (SalesService::quoteCartCost() / fifoBatchesQuery()) —
   *  never a second cost engine, just the same figure computed ahead of time. */
  cartCost = 0;
  cartCostLoading = false;
  private costQuote$ = new Subject<void>();

  private cartItemsForQuote(): { product_id: number; quantity: number }[] {
    return this.items.value
      .filter((it: any) => it.product_id && (+it.quantity || 0) > 0)
      .map((it: any) => ({ product_id: +it.product_id, quantity: +it.quantity }));
  }

  /** Items total (before cost) − the same figure shown as "إجمالي الفاتورة".
   *  Always the live per-line price sum — both pricing modes now price every
   *  line directly, so there is no separate "estimate vs entered total" case
   *  left to reconcile. */
  get cartItemsTotal(): number {
    return this.computedTotal;
  }

  get cartItemCount(): number {
    return this.cartItemsForQuote().length;
  }

  get expectedProfit(): number {
    return +(this.cartItemsTotal - this.cartCost).toFixed(2);
  }

  // ── Card fee preview (Part 3) — instant, purely client-side from the
  // already-loaded paymentMethods (same processing_fee_percent the backend
  // uses at sale time); never changes the invoice total, informational only.
  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  lineFeeAmount(payment: AbstractControl): number {
    const amount = +(payment.get('amount')?.value) || 0;
    return this.round2(amount * this.methodFeePercent(payment) / 100);
  }

  lineCompanyReceives(payment: AbstractControl): number {
    const amount = +(payment.get('amount')?.value) || 0;
    return this.round2(amount - this.lineFeeAmount(payment));
  }

  get totalCardFee(): number {
    return this.round2(this.payments.controls.reduce((sum, c) => sum + this.lineFeeAmount(c), 0));
  }

  get totalCompanyReceives(): number {
    return this.round2(this.paymentsTotal - this.totalCardFee);
  }

  get hasAnyCardFee(): boolean {
    return this.totalCardFee > 0;
  }

  // ── Lifecycle ───────────────────────────────────────────

  ngOnInit(): void {
    // Arrived from Customer Details' "Create Invoice" action — preselect the
    // customer exactly like picking them from the search dropdown (same
    // selectCustomer() used everywhere else), just skipping the search step.
    const preselectId = this.route.snapshot.queryParamMap.get('customer_id');
    if (preselectId) {
      this.customerService.getCustomer(+preselectId).subscribe({
        next: (res) => {
          const customer = (res?.data ?? res)?.customer;
          if (customer) this.selectCustomer(customer);
        },
        error: () => {},
      });
    }

    this.initLoading = true;
    forkJoin({
      currencies: this.salesService.getSellerCurrencies(),
      safes:      this.salesService.getSellerShopSafes(),
      paymentMethods: this.salesService.getSellerPaymentMethods(),
    }).subscribe({
      next: ({ currencies, safes, paymentMethods }) => {
        this.currencies = currencies;
        this.shopSafes  = safes;
        this.paymentMethods = paymentMethods;
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
      this.showCustomerDropdown = true;
      this.customerSearchedNoResults = results.length === 0 && this.customerQuery.trim().length >= 3;
    });

    // Recompute the automatic invoice total whenever quantities change.
    this.items.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => { this.syncComputedTotal(); this.costQuote$.next(); });

    // Live cost preview — debounced so it doesn't fire on every keystroke.
    this.costQuote$.pipe(
      debounceTime(400),
      switchMap(() => {
        const cartItems = this.cartItemsForQuote();
        if (!cartItems.length) { this.cartCost = 0; return of(null); }
        this.cartCostLoading = true;
        return this.salesService.quoteCartCost(cartItems);
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (res) => { this.cartCostLoading = false; if (res) this.cartCost = res.total_cost; },
      error: () => { this.cartCostLoading = false; },
    });

    this.addItem();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.productSearchSubjects.forEach((s) => s.complete());
    this.stopPolling();
  }

  /** Read-only display of the invoice date — the server always stamps the real creation date. */
  get todayDisplay(): string {
    return new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ── Customer — search by name OR phone, either field drives the same lookup ──
  onPhoneInput(value: string) {
    this.customerQuery = value;
    this.form.get('phone')?.setValue(value);
    this.customerSearch$.next(value);
  }

  /** Typing a name also searches — selecting a result fills in the phone too. */
  onNameInput(value: string) {
    this.form.get('name')?.setValue(value);
    this.customerQuery = value;
    this.customerSearch$.next(value);
  }

  selectCustomer(customer: Customer) {
    this.customerQuery = customer.phone;
    this.form.get('phone')?.setValue(customer.phone);
    this.form.get('name')?.setValue(customer.name);
    this.showCustomerDropdown = false;
    this.customerResults = [];
    this.customerSearchedNoResults = false;
  }

  closeCustomerDropdown() {
    setTimeout(() => { this.showCustomerDropdown = false; }, 200);
  }

  /** "+ إضافة عميل جديد" — opens a small inline form, prefilled from whatever
   *  was already typed (a digit-heavy query goes to phone, otherwise name). */
  openQuickAddCustomer() {
    const q = this.customerQuery.trim();
    const looksLikePhone = /^[\d\s+()-]+$/.test(q) && q.length > 0;
    this.quickAddCustomer = {
      name: looksLikePhone ? '' : q,
      phone: looksLikePhone ? q : '',
      email: '',
      address: '',
    };
    this.quickAddCustomerError = '';
    this.showQuickAddCustomer = true;
    this.showCustomerDropdown = false;
  }

  submitQuickAddCustomer() {
    if (!this.quickAddCustomer.name.trim() || !this.quickAddCustomer.phone.trim()) {
      this.quickAddCustomerError = 'الاسم ورقم الهاتف مطلوبان.';
      return;
    }
    this.quickAddCustomerLoading = true;
    this.quickAddCustomerError = '';
    this.salesService.createCustomer({
      name: this.quickAddCustomer.name.trim(),
      phone: this.quickAddCustomer.phone.trim(),
      email: this.quickAddCustomer.email.trim() || null,
      address: this.quickAddCustomer.address.trim() || null,
    }).subscribe({
      next: (customer) => {
        this.quickAddCustomerLoading = false;
        this.showQuickAddCustomer = false;
        this.selectCustomer(customer);
      },
      error: (err) => {
        this.quickAddCustomerLoading = false;
        this.quickAddCustomerError = err?.error?.message || 'تعذّر حفظ بيانات العميل.';
      },
    });
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
      // Compose-dialog tagging only (receipt/invoice grouping) — null for every
      // normal/manually-added row.
      parent_product_id: [null],
      role:       [null],
    });
    this.items.push(group);
    this.productQueries.push('');
    this.productResults.push([]);
    this.showProductDropdown.push(false);
    this.selectedGoods.push(null);
    this.compositionKeys.push(null);
    this.parentNames.push(null);

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
      this.compositionKeys.splice(index, 1);
      this.parentNames.splice(index, 1);
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

  /** True when a manually-entered line price falls below its category's
   *  minimum — only checked in "إجمالي يدوي" (Manual Total) mode, which is
   *  the only mode with a price-floor override/manager-approval workflow
   *  (see onSubmit()). Compares the cashier's actual entered price directly —
   *  there is no more distribution estimate to compare against. */
  isPriceWarning(index: number): boolean {
    if (this.pricingMode !== 'global') return false;
    const goods = this.selectedGoods[index];
    if (!goods) return false;
    const category = goods.supply_item?.product?.category;
    if (!category) return false;
    const price    = this.lineUnitPrice(index);
    const minPrice = +(category.minimum_sell_price ?? 0);
    return minPrice > 0 && price > 0 && price < minPrice;
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
          estimated_price: +this.lineUnitPrice(i).toFixed(4),
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
  /** Payment method options for the dropdown — admin-managed, unlimited (see Payment Methods module). */
  paymentMethods: PaymentMethod[] = [];

  /** Card-type methods (visa/mastercard/bank_card) require a transaction/reference number. */
  private methodRequiresTxn(methodId: number | null): boolean {
    const method = this.paymentMethods.find(m => m.id === methodId);
    return !!method && CARD_PAYMENT_TYPES.includes(method.type);
  }

  methodNeedsTxn(payment: AbstractControl): boolean {
    return this.methodRequiresTxn(payment.get('payment_method_id')?.value);
  }

  /** The processing fee % configured for a payment row's currently selected method (0 for non-card types). */
  methodFeePercent(payment: AbstractControl): number {
    const method = this.paymentMethods.find(m => m.id === payment.get('payment_method_id')?.value);
    return method ? +method.processing_fee_percent : 0;
  }

  methodName(payment: AbstractControl): string {
    const method = this.paymentMethods.find(m => m.id === payment.get('payment_method_id')?.value);
    return method?.name ?? '';
  }

  addPayment() {
    const defaultCurrency = this.currencies.find(c => c.code === 'EGP') ?? this.currencies[0];
    const defaultMethod = this.paymentMethods.find(m => m.type === 'cash') ?? this.paymentMethods[0];
    const group = this.fb.group({
      currency_id:        [defaultCurrency?.id ?? null, Validators.required],
      amount:             [null, [Validators.required, Validators.min(0.01)]],
      payment_method_id:  [defaultMethod?.id ?? null, Validators.required],
      transaction_number: [''],
    });

    // Transaction number is required only for card-type methods. Toggle the
    // validator dynamically as the selected method changes.
    group.get('payment_method_id')?.valueChanges.subscribe((methodId) => {
      const txn = group.get('transaction_number');
      if (this.methodRequiresTxn(methodId)) {
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
      if (this.form.get('total_amount')?.invalid)  missing.push('إجمالي الفاتورة');
      this.alert = { show: true, type: 'error', message: `يرجى ملء الحقول المطلوبة: ${missing.join('، ')}.` };
      return;
    }

    if (this.items.invalid) {
      this.alert = { show: true, type: 'error', message: 'يرجى التأكد من اختيار المنتج وإدخال الكمية لجميع الأصناف.' };
      return;
    }

    // Every line must have a unit price — except Alcohol, whose price is
    // deliberately always 0 (see itemConfigured()). Applies in both pricing
    // modes: "أسعار الأصناف" pre-fills from config but still requires a
    // price; "إجمالي يدوي" (Manual Total) requires the cashier to type one.
    {
      const missing = this.selectedGoods.findIndex((g, idx) => g != null && this.lineUnitPrice(idx) <= 0 && this.lineRole(idx) !== 'alcohol');
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

    // The price-floor violation/override-approval flow applies only to
    // "إجمالي يدوي" (Manual Total) mode — the cashier is deliberately
    // re-pricing every line by hand there, so a price under the category
    // minimum needs manager sign-off before the sale can go through.
    if (this.pricingMode === 'global' && this.hasViolations && this.overrideState !== 'approved') {
      this.overrideState = 'needed';
      return;
    }

    const fv = this.form.value;
    const payload: any = {
      phone:        fv.phone      || '',
      name:         fv.name       || '',
      price_type:   fv.price_type,
      safe_id:      fv.safe_id ? +fv.safe_id : null,
      // Always computed — never manually typed, in either pricing mode.
      total_amount: +this.computedTotal.toFixed(2),
      pricing_mode: this.pricingMode,
      payments: this.isPhysicalSafe
        ? this.payments.value.map((p: any) => ({
            currency_id:        +p.currency_id,
            amount:             +p.amount,
            payment_method_id:  +p.payment_method_id,
            transaction_number: this.methodRequiresTxn(+p.payment_method_id) ? (p.transaction_number?.trim() || null) : null,
          }))
        : [],
      items: this.items.value.map((item: any) => ({
        product_id: item.product_id,
        quantity:   item.quantity,
        // Send the editable unit price so the backend uses it (no distribution).
        price:      (item.price === null || item.price === '') ? null : +item.price,
        parent_product_id: item.parent_product_id || null,
        role:       item.role || null,
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
    this.form.reset({ phone: '', name: '', price_type: 'retail', safe_id: null, total_amount: null });
    while (this.items.length) { this.items.removeAt(0); }
    while (this.payments.length) { this.payments.removeAt(0); }
    this.productSearchSubjects.forEach((s) => s.complete());
    this.productQueries = [];
    this.productResults = [];
    this.showProductDropdown = [];
    this.selectedGoods = [];
    this.compositionKeys = [];
    this.parentNames = [];
    this.productSearchSubjects = [];
    this.cartCost = 0;
    this.addItem();
    if (this.isPhysicalSafe) { this.addPayment(); }
  }
}
