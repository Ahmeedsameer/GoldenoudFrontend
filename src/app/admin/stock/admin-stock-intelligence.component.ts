import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AdminStockIntelligenceService,
  StockOverview,
  StockLocationSummary,
  InventoryRow,
  InventoryPage,
  LowStockRow,
  SupplyRow,
  SupplyPage,
} from '../../services/admin-stock-intelligence.service';
import { ShopService } from '../../services/shop.service';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-admin-stock-intelligence',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent],
  templateUrl: './admin-stock-intelligence.component.html',
})
export class AdminStockIntelligenceComponent implements OnInit {
  private svc     = inject(AdminStockIntelligenceService);
  private shopSvc = inject(ShopService);

  // ── Shops ─────────────────────────────────────────────────────────
  shops: { id: number; name: string }[] = [];

  // ── Global filter ─────────────────────────────────────────────────
  // null = all locations,  0 = warehouse,  N = shop id
  selectedLocation: number | null = null;
  threshold = 5;

  // ── Overview + Low Stock ──────────────────────────────────────────
  loading  = false;
  errorMsg = '';
  overview: StockOverview | null = null;
  lowStock: LowStockRow[]        = [];

  // ── Inventory browser ─────────────────────────────────────────────
  invLoading = false;
  inventory:  InventoryRow[]                      = [];
  invMeta:    Omit<InventoryPage, 'data'> | null  = null;
  invPage     = 1;
  invSearch   = '';

  // ── Supply history ────────────────────────────────────────────────
  supLoading = false;
  supplies:   SupplyRow[]                       = [];
  supMeta:    Omit<SupplyPage, 'data'> | null   = null;
  supPage     = 1;
  supSearch   = '';
  supFrom     = '';
  supTo       = '';

  // ── Lifecycle ─────────────────────────────────────────────────────
  ngOnInit(): void {
    this.shopSvc.getShops({ per_page: 200 }).subscribe({
      next: (res) => {
        this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name }));
      },
    });
    this.load();
  }

  // ── Main load (overview + low-stock in parallel) ──────────────────
  private load(): void {
    this.loading  = true;
    this.errorMsg = '';
    const sid = this.selectedLocation;

    forkJoin({
      overview: this.svc.getOverview(this.threshold, sid),
      lowStock: this.svc.getLowStock(this.threshold, sid),
    }).subscribe({
      next: ({ overview, lowStock }) => {
        this.overview = overview;
        this.lowStock = lowStock.items;
        this.loading  = false;
        this.invPage  = 1;
        this.loadInventory();
      },
      error: () => {
        this.loading  = false;
        this.errorMsg = 'فشل تحميل بيانات المخزون. يرجى المحاولة مرة أخرى.';
      },
    });
  }

  reload(): void { this.invPage = 1; this.load(); }

  applyThreshold(): void { this.reload(); }

  setLocation(val: string): void {
    this.selectedLocation = val === '' ? null : parseInt(val, 10);
    this.invPage = 1;
    this.reload();
  }

  // ── Inventory browser ─────────────────────────────────────────────
  loadInventory(): void {
    this.invLoading = true;
    this.svc.getInventory({
      shop_id:  this.selectedLocation,
      search:   this.invSearch || undefined,
      page:     this.invPage,
      per_page: 30,
    }).subscribe({
      next: (page) => {
        this.inventory = page.data;
        this.invMeta   = { current_page: page.current_page, last_page: page.last_page, total: page.total, per_page: page.per_page };
        this.invLoading = false;
      },
      error: () => { this.invLoading = false; },
    });
  }

  applyInvSearch(): void { this.invPage = 1; this.loadInventory(); }
  resetInvSearch(): void { this.invSearch = ''; this.invPage = 1; this.loadInventory(); }
  invNextPage(): void {
    if (this.invMeta && this.invPage < this.invMeta.last_page) { this.invPage++; this.loadInventory(); }
  }
  invPrevPage(): void {
    if (this.invPage > 1) { this.invPage--; this.loadInventory(); }
  }

  // ── Supply history ────────────────────────────────────────────────
  loadSupplies(): void {
    this.supLoading = true;
    this.svc.getSupplies({
      search:   this.supSearch || undefined,
      from:     this.supFrom   || undefined,
      to:       this.supTo     || undefined,
      page:     this.supPage,
      per_page: 25,
    }).subscribe({
      next: (page) => {
        this.supplies   = page.data;
        this.supMeta    = { current_page: page.current_page, last_page: page.last_page, total: page.total, per_page: page.per_page };
        this.supLoading = false;
      },
      error: () => { this.supLoading = false; },
    });
  }

  applySupplies(): void { this.supPage = 1; this.loadSupplies(); }
  resetSupplies(): void { this.supSearch = ''; this.supFrom = ''; this.supTo = ''; this.supPage = 1; this.loadSupplies(); }
  supNextPage(): void {
    if (this.supMeta && this.supPage < this.supMeta.last_page) { this.supPage++; this.loadSupplies(); }
  }
  supPrevPage(): void {
    if (this.supPage > 1) { this.supPage--; this.loadSupplies(); }
  }

  // ── Helpers ───────────────────────────────────────────────────────
  get maxLocationValue(): number {
    return Math.max(...(this.overview?.by_location.map(l => l.stock_value) ?? [1]), 1);
  }

  lowStockSeverity(qty: number): string {
    if (qty <= 1)                    return 'critical';
    if (qty <= Math.ceil(this.threshold / 2)) return 'warning';
    return 'low';
  }

  lowStockBadge(qty: number): string {
    const s = this.lowStockSeverity(qty);
    if (s === 'critical') return 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-300';
    if (s === 'warning')  return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
  }

  lowStockRowClass(qty: number): string {
    const s = this.lowStockSeverity(qty);
    if (s === 'critical') return 'bg-error-50/50 dark:bg-error-500/5';
    if (s === 'warning')  return 'bg-orange-50/50 dark:bg-orange-500/5';
    return '';
  }

  paymentLabel(m: string): string {
    const map: Record<string, string> = {
      cash:   'نقداً',
      credit: 'آجل',
      mixed:  'مختلط',
    };
    return map[m] ?? m;
  }
}
