import { Component, EventEmitter, inject, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { SalesService } from '../../../services/sales.service';
import { GoodsSearchResult, SalesCategory } from '../../../models/sales.model';

@Component({
  selector: 'app-product-lookup-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-lookup-panel.component.html',
})
export class ProductLookupPanelComponent implements OnInit, OnDestroy {

  @Output() productSelected = new EventEmitter<GoodsSearchResult>();

  private salesService  = inject(SalesService);
  private destroy$      = new Subject<void>();
  private searchInput$  = new Subject<string>();

  categories: SalesCategory[]    = [];
  activeCategoryId: number | null = null;
  searchQuery  = '';
  goods: GoodsSearchResult[] = [];
  isLoading    = false;

  /** Catalog products matching the search that aren't stocked in this shop. */
  unstockedMatches: { id: number; name: string; sku: string; scalar: string }[] = [];

  // ── Lifecycle ─────────────────────────────────────────────

  ngOnInit(): void {
    // Load category tabs
    this.salesService.getSalesCategories().subscribe({
      next: (cats) => { this.categories = cats; },
    });

    // Load initial goods (all available, no filter)
    this.fetchGoods();

    // Debounced search pipe
    this.searchInput$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(() => {
        this.isLoading = true;
        return this.salesService.searchGoods(
          this.searchQuery, 60, this.activeCategoryId ?? undefined
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (results) => { this.goods = results; this.isLoading = false; this.refreshUnstockedHint(); },
      error: ()        => { this.isLoading = false; },
    });
  }

  /**
   * When a non-empty search returns no in-stock goods, look up whether the
   * product exists in the catalog but isn't stocked in this shop, so we can
   * show a helpful hint instead of a bare "no results".
   */
  private refreshUnstockedHint(): void {
    const q = this.searchQuery.trim();
    if (q.length === 0 || this.goods.length > 0) {
      this.unstockedMatches = [];
      return;
    }
    this.salesService.searchUnstockedProducts(q).subscribe({
      next: (products) => { this.unstockedMatches = products; },
      error: ()        => { this.unstockedMatches = []; },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Interactions ─────────────────────────────────────────

  /** Switch active category tab. */
  selectCategory(id: number | null): void {
    if (this.activeCategoryId === id) return;
    this.activeCategoryId = id;
    this.fetchGoods();
  }

  /** React to search box keystrokes. */
  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.searchInput$.next(value);
  }

  /** Clear the search box and reload. */
  clearSearch(): void {
    this.searchQuery = '';
    this.fetchGoods();
  }

  /** Emit the selected goods record to the parent cashier (blocked when out). */
  onCardClick(goods: GoodsSearchResult): void {
    if (this.isOutOfStock(goods)) return;
    this.productSelected.emit(goods);
  }

  isOutOfStock(goods: GoodsSearchResult): boolean {
    return goods.stock_level === 'out' || (goods.product_shop_stock ?? 1) <= 0;
  }

  /** Traffic-light border/badge classes for a product card. */
  stockClasses(goods: GoodsSearchResult): string {
    switch (goods.stock_level) {
      case 'out':      return 'border-error-300 dark:border-error-500/40 opacity-60';
      case 'critical': return 'border-error-300 dark:border-error-500/40';
      case 'warning':  return 'border-amber-300 dark:border-amber-500/40';
      default:         return 'border-gray-200 dark:border-white/[0.05]';
    }
  }

  /** Small colored dot class per level (green/yellow/red). */
  stockDot(goods: GoodsSearchResult): string {
    switch (goods.stock_level) {
      case 'out':
      case 'critical': return 'bg-error-500';
      case 'warning':  return 'bg-amber-400';
      default:         return 'bg-success-500';
    }
  }

  /** Lightweight remaining-stock text for low/critical/out (sales-safe). */
  stockNote(goods: GoodsSearchResult): string | null {
    const qty = goods.product_shop_stock;
    const unit = goods.supply_item?.product?.scalar ?? '';
    if (goods.stock_level === 'out' || (qty ?? 1) <= 0) return 'نفد من المخزون';
    if (goods.stock_level === 'warning' || goods.stock_level === 'critical') {
      return `متبقٍ ${qty} ${unit}`;
    }
    return null;
  }

  // ── Internal ─────────────────────────────────────────────

  private fetchGoods(): void {
    this.isLoading = true;
    this.salesService
      .searchGoods(this.searchQuery, 60, this.activeCategoryId ?? undefined)
      .subscribe({
        next: (results) => { this.goods = results; this.isLoading = false; this.refreshUnstockedHint(); },
        error: ()        => { this.isLoading = false; },
      });
  }

  /** Skeleton placeholder count for the loading state. */
  readonly skeletons = Array(10).fill(0);
}
