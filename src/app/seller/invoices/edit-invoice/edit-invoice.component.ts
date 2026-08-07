import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, switchMap } from 'rxjs';
import { SalesService } from '../../../services/sales.service';
import { AdminInvoiceService } from '../../../services/admin-invoice.service';
import { ManagerInvoiceService } from '../../../services/manager-invoice.service';
import { SafeService } from '../../../services/safe.service';
import { ShopService } from '../../../services/shop.service';
import { AuthService } from '../../../services/auth.service';
import { Invoice } from '../../../models/sales.model';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { SalesCatalogComponent, CatalogProduct } from '../../../shared/components/sales-catalog/sales-catalog.component';
import { ComposedLine } from '../../cashier/catalog-sell-dialog/catalog-sell-dialog.component';

interface EditLine {
  product_id: number;
  name: string;
  sku: string | null;
  quantity: number;
  /** Compound sub-lines (oil/bottle/alcohol) only — the backend skips
   *  auto-pricing for role-tagged items (see priceInvoiceItems()), so their
   *  price/parent must be resubmitted exactly, whether carried over unchanged
   *  from the original invoice or freshly computed by the Product Builder. */
  price?: number | null;
  parent_product_id?: number | null;
  role?: string | null;
  /** Display-only grouping so sub-lines of the same composed perfume render together. */
  composition_key?: string | null;
  parent_name?: string | null;
}

interface LineTotals {
  old_total: number;
  new_total: number;
  difference: number;
  old_lines: { product_id: number; product_name: string; quantity: number; price: number }[];
  new_lines: { product_id: number; product_name: string; quantity: number; price: number }[];
}

/** One row of the per-product before/after comparison table. */
interface LineComparison {
  product_id: number;
  product_name: string;
  old_quantity: number;
  new_quantity: number;
  old_price: number;
  new_price: number;
  difference: number;
}

/**
 * Edit Invoice (Admin / Sales Manager only) — restores stock to the original
 * batches then rebuilds via the same FIFO/pricing engine a new sale uses
 * (see SalesService::editInvoice() on the backend). Old/new totals and
 * per-line prices shown here are NEVER computed client-side — they always
 * come from SalesService::previewEditInvoice(), which runs the exact same
 * rebuild engine as the real save then rolls back, so the preview can never
 * drift from what saving would actually produce. Cancel Invoice and Print
 * Invoice are separate, untouched flows.
 *
 * Product selection reuses <app-sales-catalog> — the exact same POS catalog
 * cashier uses — always scoped to the invoice's OWN branch (invoice.shop_id),
 * never the current admin/manager's own branch: adding an item must reflect
 * what that branch can actually sell today, since that's the branch FIFO
 * will actually consume from on save.
 */
@Component({
  selector: 'app-edit-invoice',
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent, ButtonComponent, SalesCatalogComponent],
  templateUrl: './edit-invoice.component.html',
})
export class EditInvoiceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesService = inject(SalesService);
  private adminInvoiceService = inject(AdminInvoiceService);
  private managerInvoiceService = inject(ManagerInvoiceService);
  private safeService = inject(SafeService);
  private shopService = inject(ShopService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  invoiceId!: number;
  invoice: Invoice | null = null;
  lines: EditLine[] = [];

  // ── Safe settlement — where the financial difference (if any) posts to.
  //    Independent of the catalog's branch: admin may settle from any
  //    branch's safe; manager is always their own branch, no dropdown. ──────
  branches: { id: number; name: string }[] = [];
  settlementBranchId: number | null = null;
  safes: any[] = [];
  safeId: number | null = null;
  note = '';

  pageLoading = false;
  saving = false;
  alert: { show: boolean; type: 'success' | 'error' | ''; message: string } = { show: false, type: '', message: '' };
  result: LineTotals | null = null;

  // ── Live, server-computed old/new preview — recalculated (debounced) on
  //    every line change via previewEditInvoice() (read-only, rolls back
  //    server-side). Never derived from local math — FIFO/batch pricing must
  //    stay single-sourced from the server. ──────────────────────────────
  preview: LineTotals | null = null;
  previewLoading = false;
  previewError: string | null = null;
  private previewTrigger$ = new Subject<void>();

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  private get service() {
    return this.isAdmin ? this.adminInvoiceService : this.managerInvoiceService;
  }

  /** The catalog is ALWAYS this — the invoice's own branch, never overridable. */
  get invoiceShopId(): number | null {
    return (this.invoice as any)?.shop_id ?? null;
  }

  /** After a save, the real result replaces the live preview as the summary source. */
  get summary(): LineTotals | null {
    return this.result ?? this.preview;
  }

  get difference(): number {
    return this.summary?.difference ?? 0;
  }

  get safeRequired(): boolean {
    return this.difference !== 0;
  }

  /** Per-product before/after rows, limited to products that actually changed
   *  (added, removed, quantity changed, or resolved price changed). */
  get changedLines(): LineComparison[] {
    const s = this.summary;
    if (!s) return [];
    const byId = new Map<number, LineComparison>();
    for (const l of s.old_lines) {
      byId.set(l.product_id, {
        product_id: l.product_id, product_name: l.product_name,
        old_quantity: l.quantity, new_quantity: 0, old_price: l.price, new_price: 0, difference: 0,
      });
    }
    for (const l of s.new_lines) {
      const row = byId.get(l.product_id) ?? {
        product_id: l.product_id, product_name: l.product_name,
        old_quantity: 0, new_quantity: 0, old_price: 0, new_price: 0, difference: 0,
      };
      row.new_quantity = l.quantity;
      row.new_price = l.price;
      byId.set(l.product_id, row);
    }
    for (const row of byId.values()) {
      row.difference = round2(row.new_quantity * row.new_price - row.old_quantity * row.old_price);
    }
    return Array.from(byId.values()).filter(
      (row) => row.old_quantity !== row.new_quantity || row.old_price !== row.new_price,
    );
  }

  ngOnInit(): void {
    this.invoiceId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadInvoice();

    if (this.isAdmin) {
      this.shopService.getShops({ per_page: 200 }).subscribe({
        next: (res: any) => { this.branches = (res.data || []).map((s: any) => ({ id: s.id, name: s.name })); },
        error: () => {},
      });
    }

    this.previewTrigger$
      .pipe(
        debounceTime(400),
        switchMap(() => {
          this.previewLoading = true;
          this.previewError = null;
          return this.service.previewEdit(this.invoiceId, {
            items: this.buildItemsPayload(),
            pricing_mode: 'auto',
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res: any) => {
          this.previewLoading = false;
          const data = res.data || res;
          this.preview = { old_total: data.old_total, new_total: data.new_total, difference: data.difference, old_lines: data.old_lines ?? [], new_lines: data.new_lines ?? [] };
        },
        error: (err: any) => {
          this.previewLoading = false;
          this.preview = null;
          this.previewError = err?.error?.message || 'تعذّر حساب الفرق المالي.';
        },
      });
  }

  loadInvoice(): void {
    this.pageLoading = true;
    // Viewing works the same for every role (see InvoiceDetailComponent) —
    // only the edit() mutation itself needs the role-scoped service.
    this.salesService.getInvoice(this.invoiceId).subscribe({
      next: (res: any) => this.onInvoiceLoaded(res.data || res),
      error: () => { this.pageLoading = false; },
    });
  }

  private onInvoiceLoaded(invoice: Invoice): void {
    this.invoice = invoice;
    this.lines = ((invoice as any).items ?? []).map((it: any) => ({
      product_id: it.product_id,
      name: it.product_name ?? it.product?.name ?? `#${it.product_id}`,
      sku: it.product_sku ?? it.product?.sku ?? null,
      quantity: +it.quantity,
      price: it.role ? +it.price : null,
      parent_product_id: it.role ? (it.parent_product_id ?? null) : null,
      role: it.role ?? null,
      composition_key: it.role ? String(it.parent_product_id ?? it.product_id) : null,
      parent_name: it.parent_product_name ?? null,
    }));
    this.pageLoading = false;

    // Safe settlement defaults to the invoice's own branch for everyone —
    // admin can then change it via the branch dropdown; manager can't.
    this.settlementBranchId = this.invoiceShopId;
    this.loadSafes();
    this.triggerPreview();
  }

  /** Admin: reload the safe list for whichever branch is selected. Manager: always their own branch, server-enforced regardless. */
  loadSafes(): void {
    this.safeId = null;
    if (this.isAdmin) {
      if (!this.settlementBranchId) { this.safes = []; return; }
      this.safeService.getSafes({ shop_id: this.settlementBranchId }).subscribe({
        next: (res: any) => { this.safes = res.data || res || []; },
        error: () => { this.safes = []; },
      });
    } else {
      this.safeService.getMyShopSafes().subscribe({
        next: (res: any) => { this.safes = res.data || res || []; },
        error: () => { this.safes = []; },
      });
    }
  }

  onBranchChange(): void {
    this.loadSafes();
  }

  safeLabel(safe: any): string {
    const location = safe.shop ? safe.shop.name : 'الشركة';
    return `${safe.safe_type?.name || 'خزنة'} — ${location}`;
  }

  // ── Sales Catalog — same picker cashier uses, scoped to the invoice's own branch ──

  onCatalogProductSelected(p: CatalogProduct): void {
    const existing = this.lines.find((l) => l.product_id === p.id && !l.role);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.lines.push({ product_id: p.id, name: p.name, sku: p.sku, quantity: 1 });
    }
    this.triggerPreview();
  }

  onCatalogCompositionAdded(event: { perfumeName: string; lines: ComposedLine[] }): void {
    for (const line of event.lines) {
      this.lines.push({
        product_id: line.product_id, name: line.name, sku: line.sku, quantity: line.quantity,
        price: line.price, parent_product_id: line.parent_product_id, role: line.role,
        composition_key: line.composition_key, parent_name: event.perfumeName,
      });
    }
    this.triggerPreview();
  }

  onCatalogPickError(message: string): void {
    this.alert = { show: true, type: 'error', message };
  }

  /** A composed-perfume sub-line (oil/bottle/alcohol) is removed as a whole
   *  group — the same unit it was added as via the Product Builder; removing
   *  only one piece would leave an orphaned line with no matching parts. */
  removeLine(index: number): void {
    const line = this.lines[index];
    if (line?.composition_key) {
      this.lines = this.lines.filter((l) => l.composition_key !== line.composition_key);
    } else {
      this.lines.splice(index, 1);
    }
    this.triggerPreview();
  }

  onQuantityChange(): void {
    this.triggerPreview();
  }

  /** Debounced (400ms) — fires the read-only server preview after any line
   *  edit, so Old/New/Difference stay live without hammering the backend on
   *  every keystroke. Cleared while there are no valid lines to price. */
  triggerPreview(): void {
    if (this.lines.length === 0 || this.lines.some((l) => !l.quantity || l.quantity <= 0)) {
      this.preview = null;
      this.previewError = null;
      return;
    }
    this.previewTrigger$.next();
  }

  private buildItemsPayload() {
    return this.lines.map((l) => ({
      product_id: l.product_id,
      quantity: l.quantity,
      price: l.role ? l.price : undefined,
      parent_product_id: l.parent_product_id ?? undefined,
      role: l.role ?? undefined,
    }));
  }

  canSave(): boolean {
    if (this.lines.length === 0 || this.lines.some((l) => !l.quantity || l.quantity <= 0) || this.saving) {
      return false;
    }
    if (this.safeRequired && !this.safeId) {
      return false;
    }
    return true;
  }

  save(): void {
    if (!this.canSave()) return;
    this.saving = true;
    this.alert = { show: false, type: '', message: '' };
    this.result = null;

    this.service.edit(this.invoiceId, {
      items: this.buildItemsPayload(),
      safe_id: this.safeId,
      note: this.note || null,
    }).subscribe({
      next: (res: any) => {
        this.saving = false;
        const data = res.data || res;
        this.result = { old_total: data.old_total, new_total: data.new_total, difference: data.difference, old_lines: data.old_lines ?? [], new_lines: data.new_lines ?? [] };
        this.preview = null;
        this.alert = { show: true, type: 'success', message: 'تم تعديل الفاتورة بنجاح.' };
      },
      error: (err: any) => {
        this.saving = false;
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'تعذّر تعديل الفاتورة.' };
      },
    });
  }

  backToInvoice(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
