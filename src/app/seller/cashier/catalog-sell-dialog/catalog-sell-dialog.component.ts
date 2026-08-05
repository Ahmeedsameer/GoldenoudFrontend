import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, map } from 'rxjs';
import { SalesService } from '../../../services/sales.service';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { LoadingComponent } from '../../../loading/loading.component';

interface PickerProduct {
  id: number;
  name: string;
  sku: string | null;
  unit: string;
  image?: string | null;
  capacity_ml: number | null;
  configured_unit_price: number | null;
  shop_stock: number;
}

export interface ComposedLine {
  product_id: number;
  name: string;
  sku: string | null;
  unit: string;
  quantity: number;
  price: number;
  stock: number;
  role: 'oil' | 'bottle' | 'alcohol' | null;
  parent_product_id: number;
  /** Client-only grouping token shared by the 3 lines of one manufacturing
   *  operation — never sent to the backend save-invoice payload. Lets the
   *  cashier cart (cashier.component.ts) collapse them into a single visible
   *  row and remove/re-price them together. See cashier.component's
   *  isHiddenMaterialRow()/compositionGroup(). */
  composition_key: string;
}

/**
 * Product Builder — belongs ONLY to the Sales screen, never to Product
 * Management. A Compound Product (a perfume) is nothing but a catalog name;
 * it has no stored recipe, default oil or bottle. Every time the seller picks
 * one from the Sales Catalog, this opens fresh and empty (see reset()): the
 * seller picks ANY oil, enters ANY quantity, picks ANY bottle, and any number
 * of identical bottles (Manufacturing Quantity) — every single time, with
 * zero memory of any previous sale.
 *
 * Pricing rule: there is NO manual selling-price entry here at all — Oil and
 * Bottle are always charged at their REAL configured price (the exact same
 * `resolveConfiguredUnitPrice()` used everywhere else in Sales, i.e. Pricing
 * Management), Alcohol always stays at 0 (a pure operational material, its
 * own real cost/FIFO value is independently tracked regardless of this
 * line's price). "Add to Invoice" is blocked until the chosen oil AND bottle
 * both have a real configured price greater than 0. The cashier CAN still
 * later override the perfume's effective price from the cart itself
 * (cashier.component's manufacturedUnitPrice()/setManufacturedUnitPrice()) —
 * that's an invoice-side override exactly like editing any other product's
 * price, not something this dialog knows or cares about. The chosen bottle's
 * capacity_ml still hard-validates the PER-BOTTLE oil quantity, and stock is
 * still checked (scaled by Manufacturing Quantity), before "Add to Invoice"
 * unlocks. Closing the Builder without clicking "Add to Invoice" discards
 * everything typed — nothing is ever auto-saved.
 *
 * Opened directly by setting [product] — there is no browse/search step
 * inside this component; browsing the catalog happens on the Sales page
 * itself (see cashier.component's always-visible catalog panel).
 */
@Component({
  selector: 'app-catalog-sell-dialog',
  imports: [CommonModule, FormsModule, ModalComponent, LoadingComponent],
  templateUrl: './catalog-sell-dialog.component.html',
})
export class CatalogSellDialogComponent implements OnInit, OnChanges {
  private salesService = inject(SalesService);

  /** Set to open the Builder immediately for this product; null closes it. */
  @Input() product: { id: number; name: string; default_oil_id?: number | null } | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() added = new EventEmitter<ComposedLine[]>();

  get show(): boolean { return !!this.product; }

  oilQuery = '';
  oilResults: PickerProduct[] = [];
  private oilSearch$ = new Subject<string>();
  selectedOil: PickerProduct | null = null;
  oilQty: number | null = null;

  bottleQuery = '';
  bottleResults: PickerProduct[] = [];
  private bottleSearch$ = new Subject<string>();
  selectedBottle: PickerProduct | null = null;

  alcoholQuery = '';
  alcoholResults: PickerProduct[] = [];
  private alcoholSearch$ = new Subject<string>();
  selectedAlcohol: PickerProduct | null = null;
  alcoholQty: number | null = null;
  /** True once the cashier has typed into Alcohol Quantity themselves — after that,
   *  the auto-suggestion (bottle capacity − oil qty) never overwrites it again. */
  private alcoholQtyTouched = false;

  /** How many identical bottles this operation manufactures. Oil/Alcohol
   *  quantities above are always PER BOTTLE — everything is multiplied by
   *  this when materials are deducted and when the invoice line is built. */
  manufacturingQty: number | null = 1;

  /** Real configured prices (Pricing Management, via resolveConfiguredUnitPrice)
   *  and real manufacturing cost — computed server-side for gating only, never
   *  displayed to the cashier here. Oil and Bottle must both resolve to a real
   *  price &gt; 0 before "Add to Invoice" unlocks (see canAdd). total_cost now
   *  includes Oil + Bottle + Alcohol's real cost (the true cost of the whole
   *  batch), used for internal cost/profit reporting only — Alcohol's own
   *  INVOICE price still always stays 0 regardless (see addToInvoice). */
  pricing: {
    oil_unit_price: number; oil_cost: number; oil_stock: number;
    bottle_unit_price: number; bottle_cost: number; bottle_stock: number; bottle_capacity_ml: number | null;
    alcohol_unit_price: number | null; alcohol_cost: number | null; alcohol_stock: number | null;
    total_cost: number; stock_ok: boolean; default_selling_price: number | null;
  } | null = null;
  pricingLoading = false;
  pricingError = '';
  private pricing$ = new Subject<void>();
  /** Bumped by reset() — a pricing response is only applied if this token still
   *  matches the token captured when its request was fired, so a slow response
   *  for a perfume that has since been reset/replaced can never populate stale
   *  state (the specific gap behind "values leak between manufactured perfumes"). */
  private requestSeq = 0;

  // Subscribed exactly ONCE for the component's lifetime — never re-subscribed
  // on repeated opens, which would otherwise leak a duplicate subscription
  // every time the seller reopens the Builder (a routine, expected action:
  // "must open every single time, even for the same perfume sold a minute ago").
  ngOnInit(): void {
    this.oilSearch$.pipe(
      debounceTime(300), distinctUntilChanged(),
      switchMap((q) => q.trim().length === 0 ? of([]) : this.salesService.searchOilProducts(q.trim())),
    ).subscribe((rows) => { this.oilResults = rows; });

    this.bottleSearch$.pipe(
      debounceTime(300), distinctUntilChanged(),
      switchMap((q) => q.trim().length === 0 ? of([]) : this.salesService.searchBottleProducts(q.trim())),
    ).subscribe((rows) => { this.bottleResults = rows; });

    this.alcoholSearch$.pipe(
      debounceTime(300), distinctUntilChanged(),
      switchMap((q) => q.trim().length === 0 ? of([]) : this.salesService.searchAlcoholProducts(q.trim())),
    ).subscribe((rows) => { this.alcoholResults = rows; });

    this.pricing$.pipe(
      debounceTime(250),
      switchMap(() => {
        if (!this.selectedOil || !this.selectedBottle || !this.oilQty || +this.oilQty <= 0 || !this.product) return of(null);
        this.pricingLoading = true;
        this.pricingError = '';
        const seqAtRequest = this.requestSeq;
        return this.salesService.calculateCompoundPrice({
          catalog_product_id: this.product.id,
          oil_product_id: this.selectedOil.id,
          oil_qty: +this.oilQty,
          bottle_product_id: this.selectedBottle.id,
          ...(this.selectedAlcohol && this.alcoholQty && +this.alcoholQty > 0
            ? { alcohol_product_id: this.selectedAlcohol.id, alcohol_qty: +this.alcoholQty }
            : {}),
          quantity: this.manufacturingQty && +this.manufacturingQty > 0 ? Math.trunc(+this.manufacturingQty) : 1,
        }).pipe(map((result) => ({ result, seqAtRequest })));
      }),
    ).subscribe({
      next: (payload) => {
        if (!payload) { this.pricingLoading = false; return; }
        // Discard a response that resolved after a reset (a different/closed
        // perfume) already bumped the sequence — never let it populate state.
        if (payload.seqAtRequest !== this.requestSeq) return;
        this.pricingLoading = false;
        this.pricing = payload.result;
      },
      error: (err) => {
        this.pricingLoading = false;
        this.pricing = null;
        this.pricingError = err?.error?.message || 'تعذّر حساب السعر.';
      },
    });
  }

  /** Every time a (new) product is set, the Builder resets completely — no
   *  carryover from any previous sale, matching "every sale is independent". */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && this.product) {
      this.reset();

      const defaultOilId = this.product.default_oil_id;
      this.salesService.searchOilProducts('').subscribe((rows) => {
        this.oilResults = rows;
        // Phase 7 — Default Oil is a pure convenience PRE-SELECTION, never a lock:
        // reuses the exact same selectOil() the seller would use by clicking a row,
        // so the field stays fully editable — the seller can pick any other oil.
        if (defaultOilId) {
          const match = rows.find((o: PickerProduct) => o.id === defaultOilId);
          if (match) { this.selectOil(match); }
        }
      });
      this.salesService.searchBottleProducts('').subscribe((rows) => { this.bottleResults = rows; });
      this.salesService.searchAlcoholProducts('').subscribe((rows) => { this.alcoholResults = rows; });
    }
  }

  /** Clears EVERY piece of state this component owns — oil/bottle/alcohol
   *  selections, quantities, manufacturing quantity, cost/pricing. Called on
   *  open (ngOnChanges), on close/cancel, and immediately after a successful
   *  Add to Invoice — nothing from one manufacturing operation may ever
   *  participate in the next one. Also bumps requestSeq so any pricing
   *  request already in flight is ignored when it resolves. */
  private reset(): void {
    this.oilQuery = ''; this.oilResults = []; this.selectedOil = null; this.oilQty = null;
    this.bottleQuery = ''; this.bottleResults = []; this.selectedBottle = null;
    this.alcoholQuery = ''; this.alcoholResults = []; this.selectedAlcohol = null; this.alcoholQty = null;
    this.alcoholQtyTouched = false;
    this.manufacturingQty = 1;
    this.pricing = null; this.pricingError = ''; this.pricingLoading = false;
    this.requestSeq++;
  }

  onOilQueryInput(v: string) { this.oilQuery = v; this.oilSearch$.next(v); }
  onBottleQueryInput(v: string) { this.bottleQuery = v; this.bottleSearch$.next(v); }
  onAlcoholQueryInput(v: string) { this.alcoholQuery = v; this.alcoholSearch$.next(v); }

  selectOil(o: PickerProduct) {
    this.selectedOil = o;
    this.oilQuery = o.name;
    this.oilResults = [];
    this.suggestAlcoholQty();
    this.pricing$.next();
  }

  selectBottle(b: PickerProduct) {
    this.selectedBottle = b;
    this.bottleQuery = b.name;
    this.bottleResults = [];
    this.suggestAlcoholQty();
    this.pricing$.next();
  }

  selectAlcohol(a: PickerProduct) {
    this.selectedAlcohol = a;
    this.alcoholQuery = a.name;
    this.alcoholResults = [];
    this.pricing$.next();
  }

  onOilQtyChange() {
    this.suggestAlcoholQty();
    this.pricing$.next();
  }

  /** Cashier typed the alcohol quantity themselves — the auto-suggestion must
   *  never overwrite a manually-entered value again for this sale. */
  onAlcoholQtyChange() {
    this.alcoholQtyTouched = true;
    this.pricing$.next();
  }

  /** Manufacturing Quantity changed — oil/alcohol/bottle capacity math is all
   *  per-bottle and unaffected, but the stock check and real cost (both
   *  server-computed) scale with it, so the price preview must recompute. */
  onManufacturingQtyChange() {
    this.pricing$.next();
  }

  /** Pure convenience suggestion — Alcohol Quantity = Bottle Capacity − Oil
   *  Quantity — recomputed whenever the bottle or oil quantity changes, but
   *  ONLY until the cashier edits the alcohol field themselves; after that it
   *  is left alone completely, exactly like Selling Price's one-time pre-fill. */
  private suggestAlcoholQty(): void {
    if (this.alcoholQtyTouched) return;
    if (!this.selectedBottle?.capacity_ml || !this.oilQty || +this.oilQty <= 0) return;

    const suggested = Math.round((this.selectedBottle.capacity_ml - +this.oilQty) * 1000) / 1000;
    this.alcoholQty = suggested > 0 ? suggested : null;
  }

  /** True once both Oil and Bottle have resolved to a real Pricing-Management
   *  price greater than 0 — the only way to charge a customer anything at
   *  all, per the "reuse the existing pricing engine, no manual entry" rule. */
  get materialsPriced(): boolean {
    return !!this.pricing && this.pricing.oil_unit_price > 0 && this.pricing.bottle_unit_price > 0;
  }

  /** The auto-resolved selling price per bottle — Oil's real price × per-bottle
   *  oil qty + Bottle's real price (both from Pricing Management). Displayed
   *  read-only for the cashier's reference; never editable here. The cashier
   *  can still change the effective price later, from the cart itself, after
   *  Add to Invoice — see cashier.component's setManufacturedUnitPrice(). */
  get autoPrice(): number | null {
    if (!this.materialsPriced || !this.oilQty) return null;
    return +((this.pricing!.oil_unit_price * +this.oilQty) + this.pricing!.bottle_unit_price).toFixed(2);
  }

  get canAdd(): boolean {
    return !!this.product && !!this.selectedOil && !!this.selectedBottle
      && !!this.oilQty && +this.oilQty > 0
      && !!this.selectedAlcohol && !!this.alcoholQty && +this.alcoholQty > 0
      && !!this.manufacturingQty && Number.isInteger(+this.manufacturingQty) && +this.manufacturingQty >= 1
      && !this.pricingLoading && !this.pricingError
      && !!this.pricing && this.pricing.stock_ok
      && this.materialsPriced;
  }

  addToInvoice() {
    if (!this.canAdd || !this.product || !this.selectedOil || !this.selectedBottle || !this.selectedAlcohol || !this.pricing) return;

    const parentId = this.product.id;
    const qty = Math.trunc(+this.manufacturingQty!);
    const compositionKey = crypto.randomUUID();
    // Oil and Bottle are ALWAYS charged at their real configured price (the
    // exact same Pricing Management price used everywhere else in Sales) —
    // never a manually-typed selling price, never forced to 0. Alcohol is a
    // pure operational material: its real purchase/FIFO cost/inventory value
    // is already fully and independently recorded by the Supply → Goods →
    // FIFO chain the moment it was purchased, so its SALES invoice line price
    // is deliberately always 0 (never charged to the customer, never
    // double-counted). The cashier can still override the perfume's
    // effective price afterward from the cart itself — see
    // cashier.component's setManufacturedUnitPrice(), which adjusts the
    // Bottle line's price only, leaving Oil's real price untouched.
    const lines: ComposedLine[] = [
      {
        product_id: this.selectedOil.id, name: this.selectedOil.name, sku: this.selectedOil.sku,
        unit: this.selectedOil.unit, quantity: +this.oilQty! * qty, price: this.pricing.oil_unit_price,
        stock: this.pricing.oil_stock, role: 'oil', parent_product_id: parentId, composition_key: compositionKey,
      },
      {
        product_id: this.selectedAlcohol.id, name: this.selectedAlcohol.name, sku: this.selectedAlcohol.sku,
        unit: this.selectedAlcohol.unit, quantity: +this.alcoholQty! * qty, price: 0,
        stock: this.pricing.alcohol_stock ?? 0, role: 'alcohol', parent_product_id: parentId, composition_key: compositionKey,
      },
      {
        product_id: this.selectedBottle.id, name: this.selectedBottle.name, sku: this.selectedBottle.sku,
        unit: this.selectedBottle.unit, quantity: qty, price: this.pricing.bottle_unit_price,
        stock: this.pricing.bottle_stock, role: 'bottle', parent_product_id: parentId, composition_key: compositionKey,
      },
    ];

    this.added.emit(lines);
    this.closed.emit();
    // Reset immediately — the next manufacturing operation (even for the same
    // perfume) must start from a completely clean state, not just on next open.
    this.reset();
  }

  close() {
    this.closed.emit();
    this.reset();
  }
}
