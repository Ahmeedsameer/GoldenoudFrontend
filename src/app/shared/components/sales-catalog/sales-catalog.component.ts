import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalesService } from '../../../services/sales.service';
import { CatalogSellDialogComponent, ComposedLine } from '../../../seller/cashier/catalog-sell-dialog/catalog-sell-dialog.component';
import { SearchBarComponent } from '../common/search-bar/search-bar.component';

export interface CatalogProduct {
  id: number; name: string; sku: string | null; image?: string | null;
  product_type: 'COMPOUND' | 'READY_PRODUCT' | string | null;
  configured_unit_price: number | null; shop_stock: number | null; unit: string;
  default_oil_id?: number | null;
  compound_available?: boolean | null;
  compound_unavailable_reason?: string | null;
}

/**
 * The Sales Catalog — the exact same browse-and-pick experience the POS
 * cashier screen uses (search bar + product grid; a Ready Product is
 * emitted directly, a Compound Product opens the same Product Builder
 * dialog cashier uses). Extracted out of CashierComponent so every consumer
 * (cashier, Edit Invoice, ...) shares one implementation — never a second
 * product picker. What happens to a picked item (cart line, invoice line,
 * whatever) stays entirely the caller's decision via the two outputs below;
 * this component only ever browses and picks, never mutates an invoice/cart.
 */
@Component({
  selector: 'app-sales-catalog',
  standalone: true,
  imports: [CommonModule, SearchBarComponent, CatalogSellDialogComponent],
  templateUrl: './sales-catalog.component.html',
})
export class SalesCatalogComponent implements OnInit, OnChanges {
  private salesService = inject(SalesService);

  /** Admin-only override — browse a specific branch's catalog (e.g. Edit
   *  Invoice, scoped to the invoice's original branch) instead of the
   *  logged-in user's own. Ignored server-side for every other role. */
  @Input() shopId: number | null = null;

  @Output() productSelected = new EventEmitter<CatalogProduct>();
  @Output() compositionAdded = new EventEmitter<{ perfumeName: string; lines: ComposedLine[] }>();
  /** A card was clicked but couldn't be added (out of stock / no price / compound unavailable) — caller decides how to surface it (e.g. an alert). */
  @Output() pickError = new EventEmitter<string>();

  items: CatalogProduct[] = [];
  loading = false;
  search = '';
  builderProduct: { id: number; name: string; default_oil_id?: number | null } | null = null;

  ngOnInit(): void {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['shopId'] && !changes['shopId'].firstChange) {
      this.load();
    }
  }

  private load(): void {
    this.loading = true;
    this.salesService.searchCatalogProducts(this.search, this.shopId).subscribe({
      next: (rows) => { this.items = rows; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  setSearch(value: string): void {
    this.search = value;
    this.load();
  }

  isOutOfStock(p: CatalogProduct): boolean {
    return p.product_type !== 'COMPOUND' && (p.shop_stock ?? 0) <= 0;
  }

  isMissingPrice(p: CatalogProduct): boolean {
    return p.product_type !== 'COMPOUND' && p.configured_unit_price == null;
  }

  isCompoundUnavailable(p: CatalogProduct): boolean {
    return p.product_type === 'COMPOUND' && p.compound_available === false;
  }

  onCardClick(p: CatalogProduct): void {
    if (p.product_type === 'COMPOUND') {
      if (this.isCompoundUnavailable(p)) {
        this.pickError.emit(p.compound_unavailable_reason || `${p.name} غير متاح للتركيب حالياً.`);
        return;
      }
      this.builderProduct = { id: p.id, name: p.name, default_oil_id: p.default_oil_id ?? null };
      return;
    }
    if (this.isOutOfStock(p)) {
      this.pickError.emit(`${p.name} نفد من المخزون في هذا الفرع — يحتاج توريد.`);
      return;
    }
    if (this.isMissingPrice(p)) {
      this.pickError.emit(`${p.name} ليس له سعر بيع محدد — أكمل إدارة الأسعار أولاً.`);
      return;
    }
    this.productSelected.emit(p);
  }

  closeBuilder(): void {
    this.builderProduct = null;
  }

  onCompositionAdded(lines: ComposedLine[]): void {
    this.compositionAdded.emit({ perfumeName: this.builderProduct?.name ?? '', lines });
    this.builderProduct = null;
  }
}
