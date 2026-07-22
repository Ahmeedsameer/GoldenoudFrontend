import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { SalesService } from '../../../services/sales.service';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { LoadingComponent } from '../../../loading/loading.component';

interface PickerProduct {
  id: number;
  name: string;
  sku: string | null;
  unit: string;
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
  role: 'oil' | 'bottle' | null;
  parent_product_id: number;
}

/**
 * Product Builder — belongs ONLY to the Sales screen, never to Product
 * Management. A Compound Product (a perfume) is nothing but a catalog name;
 * it has no stored recipe, default oil or bottle. Every time the seller picks
 * one from the Sales Catalog, this opens fresh and empty: the seller picks
 * ANY oil, enters ANY quantity, picks ANY bottle — every single time, with
 * zero memory of any previous sale. Oil/bottle cost are server-computed
 * (SalesService::calculateCompoundPrice) purely for reference — there is no
 * margin. The Selling Price field pre-fills once from Pricing Management's
 * stored default_selling_price, then is freely editable; any change here is
 * a per-invoice override only and never writes back to the product's
 * default (only Pricing Management can change that). The chosen bottle's
 * capacity_ml still hard-validates the oil quantity, and stock is still
 * checked, before "Add to Invoice" unlocks. Closing the Builder without
 * clicking "Add to Invoice" discards everything typed — nothing is ever
 * auto-saved.
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
  @Input() product: { id: number; name: string } | null = null;
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

  /** Reference costs only — no margin. default_selling_price is Pricing
   *  Management's stored default, used once to pre-fill sellingPrice below. */
  pricing: {
    oil_unit_price: number; oil_cost: number; oil_stock: number;
    bottle_unit_price: number; bottle_cost: number; bottle_stock: number; bottle_capacity_ml: number | null;
    total_cost: number; stock_ok: boolean; default_selling_price: number | null;
  } | null = null;
  pricingLoading = false;
  pricingError = '';
  private pricing$ = new Subject<void>();

  /** Starts pre-filled from Pricing Management's default (once), then is
   *  freely editable — an override here affects only this invoice and is
   *  never written back to the product's default. */
  sellingPrice: number | null = null;

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

    this.pricing$.pipe(
      debounceTime(250),
      switchMap(() => {
        if (!this.selectedOil || !this.selectedBottle || !this.oilQty || +this.oilQty <= 0 || !this.product) return of(null);
        this.pricingLoading = true;
        this.pricingError = '';
        return this.salesService.calculateCompoundPrice({
          catalog_product_id: this.product.id,
          oil_product_id: this.selectedOil.id,
          oil_qty: +this.oilQty,
          bottle_product_id: this.selectedBottle.id,
        });
      }),
    ).subscribe({
      next: (result) => {
        this.pricingLoading = false;
        this.pricing = result;
        // Pre-fill only once, the first time a cost reference comes back —
        // never overwrite a price the seller has already typed or edited.
        if (this.sellingPrice === null && result?.default_selling_price != null) {
          this.sellingPrice = result.default_selling_price;
        }
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
      this.oilQuery = ''; this.oilResults = []; this.selectedOil = null; this.oilQty = null;
      this.bottleQuery = ''; this.bottleResults = []; this.selectedBottle = null;
      this.pricing = null; this.pricingError = ''; this.pricingLoading = false;
      this.sellingPrice = null;

      this.salesService.searchOilProducts('').subscribe((rows) => { this.oilResults = rows; });
      this.salesService.searchBottleProducts('').subscribe((rows) => { this.bottleResults = rows; });
    }
  }

  onOilQueryInput(v: string) { this.oilQuery = v; this.oilSearch$.next(v); }
  onBottleQueryInput(v: string) { this.bottleQuery = v; this.bottleSearch$.next(v); }

  selectOil(o: PickerProduct) {
    this.selectedOil = o;
    this.oilQuery = o.name;
    this.oilResults = [];
    this.pricing$.next();
  }

  selectBottle(b: PickerProduct) {
    this.selectedBottle = b;
    this.bottleQuery = b.name;
    this.bottleResults = [];
    this.pricing$.next();
  }

  onOilQtyChange() {
    this.pricing$.next();
  }

  /** Expected Profit / Profit % — computed live for THIS invoice only, from
   *  whatever the seller has typed in Selling Price right now. Never sent to
   *  the server, never stored anywhere — purely an on-screen reference. */
  get expectedProfit(): number | null {
    if (!this.pricing || this.sellingPrice == null) return null;
    return Math.round((+this.sellingPrice - this.pricing.total_cost) * 100) / 100;
  }

  get profitPercent(): number | null {
    if (this.expectedProfit == null || !this.pricing || this.pricing.total_cost <= 0) return null;
    return Math.round((this.expectedProfit / this.pricing.total_cost) * 1000) / 10;
  }

  get canAdd(): boolean {
    return !!this.product && !!this.selectedOil && !!this.selectedBottle
      && !!this.oilQty && +this.oilQty > 0
      && !this.pricingLoading && !this.pricingError
      && !!this.pricing && this.pricing.stock_ok
      && !!this.sellingPrice && +this.sellingPrice > 0;
  }

  addToInvoice() {
    if (!this.canAdd || !this.product || !this.selectedOil || !this.selectedBottle || !this.pricing || !this.sellingPrice) return;

    const parentId = this.product.id;
    const lines: ComposedLine[] = [
      {
        product_id: this.selectedOil.id, name: this.selectedOil.name, sku: this.selectedOil.sku,
        unit: this.selectedOil.unit, quantity: +this.oilQty!, price: this.pricing.oil_unit_price,
        stock: this.pricing.oil_stock, role: 'oil', parent_product_id: parentId,
      },
      {
        product_id: this.selectedBottle.id, name: this.selectedBottle.name, sku: this.selectedBottle.sku,
        unit: this.selectedBottle.unit, quantity: 1, price: +this.sellingPrice - (this.pricing.oil_unit_price * +this.oilQty!),
        stock: this.pricing.bottle_stock, role: 'bottle', parent_product_id: parentId,
      },
    ];
    // The seller's typed Selling Price is folded entirely into the bottle
    // line so the invoice's line-total (oil + bottle) equals it exactly —
    // the customer only ever sees the one summarized perfume line anyway.

    this.added.emit(lines);
    this.closed.emit();
  }

  close() {
    this.closed.emit();
  }
}
