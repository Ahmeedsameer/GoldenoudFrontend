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
      next: (results) => { this.goods = results; this.isLoading = false; },
      error: ()        => { this.isLoading = false; },
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

  /** Emit the selected goods record to the parent cashier. */
  onCardClick(goods: GoodsSearchResult): void {
    this.productSelected.emit(goods);
  }

  isOutOfStock(_goods: GoodsSearchResult): boolean {
    return false;
  }

  // ── Internal ─────────────────────────────────────────────

  private fetchGoods(): void {
    this.isLoading = true;
    this.salesService
      .searchGoods(this.searchQuery, 60, this.activeCategoryId ?? undefined)
      .subscribe({
        next: (results) => { this.goods = results; this.isLoading = false; },
        error: ()        => { this.isLoading = false; },
      });
  }

  /** Skeleton placeholder count for the loading state. */
  readonly skeletons = Array(10).fill(0);
}
