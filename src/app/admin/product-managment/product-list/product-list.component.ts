import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ProductService } from '../../../services/product.service';
import { ListManager } from '../../../services/list-manager';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { LoadingComponent } from '../../../loading/loading.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { TableDropdownComponent } from '../../../shared/components/common/table-dropdown/table-dropdown.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { ProductScalarPipe } from '../../../pips/product-scalar.pipe';
import { SearchBarComponent } from '../../../shared/components/common/search-bar/search-bar.component';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-product-list',
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PaginationComponent,
    LoadingComponent,
    ButtonComponent,
    TableDropdownComponent,
    ModalComponent,
    ProductScalarPipe,
    SearchBarComponent,
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);
  private router = inject(Router);
  private authService = inject(AuthService);

  get isAdmin(): boolean { return this.authService.isAdmin(); }

  list = new ListManager<any>((params) => this.productService.getProducts(params));

  // ── Product Type Selector (Step 1 — "what do you want to create?") ──────
  showTypeSelector = false;
  selectedCreationType: 'RAW_MATERIAL' | 'PACKAGING' | 'COMPOUND' | 'READY_PRODUCT' | null = null;
  creationTypes = [
    { value: 'RAW_MATERIAL' as const, icon: '🛢️', title: 'مادة خام', desc: 'زيوت عطرية، كحول، ثابتات — مخزون فقط، لا تظهر في المبيعات.' },
    { value: 'PACKAGING' as const,    icon: '🧴', title: 'مواد تغليف (زجاجات)', desc: 'الزجاجات فقط — سعرها يشمل البخاخ والغطاء. لا تظهر في المبيعات.' },
    { value: 'COMPOUND' as const,     icon: '🧪', title: 'منتج مركّب (عطر)', desc: 'يُباع للعملاء ويُركَّب وقت البيع — بدون مخزون خاص به.' },
    { value: 'READY_PRODUCT' as const, icon: '📦', title: 'منتج جاهز', desc: 'يعمل تماماً كمنتجات النظام الحالية — سعر ثابت ومخزون خاص.' },
  ];

  // ── Type filter tabs — same 4-category classification used everywhere
  //    else in the ERP (Supply, Pricing, …) so the product experience is
  //    consistent across modules. ───────────────────────────────────────
  activeTypeFilter: '' | 'RAW_MATERIAL' | 'PACKAGING' | 'READY_PRODUCT' | 'COMPOUND' = '';
  filterTypes = [
    { value: '' as const,               icon: '📋', label: 'الكل' },
    { value: 'RAW_MATERIAL' as const,   icon: '🛢️', label: 'خامات' },
    { value: 'PACKAGING' as const,      icon: '🧴', label: 'مستلزمات تعبئة' },
    { value: 'READY_PRODUCT' as const,  icon: '📦', label: 'منتجات جاهزة' },
    { value: 'COMPOUND' as const,       icon: '🧪', label: 'عطور مركّبة' },
  ];

  setTypeFilter(value: typeof this.activeTypeFilter): void {
    this.activeTypeFilter = value;
    this.list.setFilter('product_type', value);
  }

  showArchiveModal = false;
  archivingProduct: any = null;

  /** Admin-only "Archived Products" view — flips the backend's ?archived=
   *  filter (see ProductController::index()). Always sent explicitly as
   *  1/0, never left undefined, since Angular's HttpParams doesn't tolerate
   *  undefined-valued params cleanly. */
  showingArchived = false;
  restoringId: number | null = null;

  toggleArchivedView(): void {
    this.showingArchived = !this.showingArchived;
    this.list.setFilter('archived', this.showingArchived ? 1 : 0);
  }

  // ── Recipe (BOM) editor state ───────────────────────────
  showRecipeModal = false;
  recipeProduct: any = null;
  recipeRows: { component_product_id: number; name: string; sku: string; quantity: number; is_variable_quantity: boolean; component_group: string }[] = [];
  recipeSearch = '';
  recipeResults: any[] = [];
  recipeLoading = false;
  recipeSaving = false;
  recipeError = '';
  private recipeSearch$ = new Subject<string>();

  // ── Form state ──────────────────────────────────────────
  archiveLoading = false;

  ngOnInit(): void {
    this.list.setLimitAndReload(30);

    // Debounced product search for the recipe component picker
    this.recipeSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.productService.getProducts({ name: term, per_page: 10 })),
      )
      .subscribe({
        next: (res) => {
          const rows = res.data?.data || res.data || [];
          const parentId = this.recipeProduct?.id;
          // exclude the parent itself and already-added components
          const existing = new Set(this.recipeRows.map((r) => r.component_product_id));
          this.recipeResults = rows.filter((p: any) => p.id !== parentId && !existing.has(p.id));
        },
        error: () => { this.recipeResults = []; },
      });
  }

  setNameFilter(value: string) {
    this.list.setFilter('name', value);
  }

  // ── Create ──────────────────────────────────────────────

  /** Step 1 — "What do you want to create?" */
  openCreate() {
    this.selectedCreationType = null;
    this.showTypeSelector = true;
  }

  /** Step 2 — chosen a type: each type is a fully independent creation page
   *  (own component, own FormGroup, own backend request validation) — never
   *  the shared generic form. See RawMaterialCreateComponent, PackagingCreateComponent,
   *  ReadyProductCreateComponent, CompoundCreateComponent. */
  chooseCreationType(type: 'RAW_MATERIAL' | 'PACKAGING' | 'COMPOUND' | 'READY_PRODUCT') {
    this.showTypeSelector = false;
    const routes: Record<typeof type, string> = {
      RAW_MATERIAL:  '/dashboard/products/create/raw-material',
      PACKAGING:     '/dashboard/products/create/packaging',
      READY_PRODUCT: '/dashboard/products/create/ready-product',
      COMPOUND:      '/dashboard/products/create/compound',
    };
    this.router.navigateByUrl(routes[type]);
  }

  // ── Edit — each type is its own dedicated page (see product-create/*),
  //    reused in edit mode via an :id route param (Edit = Add + prefill). ──

  goToEdit(product: any) {
    const routes: Record<string, string> = {
      RAW_MATERIAL:  `/dashboard/products/edit/raw-material/${product.id}`,
      PACKAGING:     `/dashboard/products/edit/packaging/${product.id}`,
      READY_PRODUCT: `/dashboard/products/edit/ready-product/${product.id}`,
      COMPOUND:      `/dashboard/products/edit/compound/${product.id}`,
    };
    this.router.navigateByUrl(routes[product.product_type] ?? routes['READY_PRODUCT']);
  }

  // ── Archive / Restore ────────────────────────────────────
  // Products are never physically deleted — archiving just hides them from
  // every browse/search/pick surface while every historical record (old
  // invoices, supplies, FIFO batches, reports, counts) keeps working
  // unchanged, since those load the product via its own relation, not this
  // list's filtered query. Admin-only (see ProductController routes).

  openArchive(product: any) {
    this.archivingProduct = product;
    this.showArchiveModal = true;
  }

  onArchive() {
    if (!this.archivingProduct) return;
    this.archiveLoading = true;

    this.productService.archiveProduct(this.archivingProduct.id).subscribe({
      next: () => {
        this.archiveLoading = false;
        this.showArchiveModal = false;
        this.archivingProduct = null;
        this.list.load();
      },
      error: (err) => {
        this.archiveLoading = false;
        console.error('Archive failed', err);
      },
    });
  }

  onRestore(product: any) {
    this.restoringId = product.id;
    this.productService.restoreProduct(product.id).subscribe({
      next: () => {
        this.restoringId = null;
        this.list.load();
      },
      error: (err) => {
        this.restoringId = null;
        console.error('Restore failed', err);
      },
    });
  }

  // ── Recipe (BOM) editor ─────────────────────────────────

  openRecipe(product: any) {
    this.recipeProduct = product;
    this.recipeRows = [];
    this.recipeSearch = '';
    this.recipeResults = [];
    this.recipeError = '';
    this.recipeLoading = true;
    this.showRecipeModal = true;

    this.productService.getComponents(product.id).subscribe({
      next: (res) => {
        this.recipeRows = (res.data || []).map((c: any) => ({
          component_product_id: c.component_product_id ?? c.id,
          name: c.name ?? c.component?.name ?? '—',
          sku: c.sku ?? c.component?.sku ?? '',
          quantity: +c.quantity || 1,
          is_variable_quantity: !!c.is_variable_quantity,
          component_group: c.component_group ?? '',
        }));
        this.recipeLoading = false;
      },
      error: () => { this.recipeLoading = false; },
    });
  }

  closeRecipe() {
    this.showRecipeModal = false;
    this.recipeProduct = null;
    this.recipeRows = [];
    this.recipeResults = [];
  }

  onRecipeSearch(term: string) {
    this.recipeSearch = term;
    if (term && term.trim().length) this.recipeSearch$.next(term.trim());
    else this.recipeResults = [];
  }

  addRecipeComponent(product: any) {
    if (product.id === this.recipeProduct?.id) return;
    if (this.recipeRows.some((r) => r.component_product_id === product.id)) return;
    this.recipeRows.push({
      component_product_id: product.id,
      name: product.name,
      sku: product.sku ?? '',
      quantity: 1,
      is_variable_quantity: false,
      component_group: '',
    });
    this.recipeSearch = '';
    this.recipeResults = [];
  }

  removeRecipeRow(index: number) {
    this.recipeRows.splice(index, 1);
  }

  saveRecipe() {
    if (!this.recipeProduct) return;
    // Only keep rows with a positive quantity
    const components = this.recipeRows
      .filter((r) => r.component_product_id && +r.quantity > 0)
      .map((r) => ({
        component_product_id: r.component_product_id,
        quantity: +r.quantity,
        is_variable_quantity: !!r.is_variable_quantity,
        component_group: r.component_group?.trim() || null,
      }));

    this.recipeSaving = true;
    this.recipeError = '';
    this.productService.saveComponents(this.recipeProduct.id, components).subscribe({
      next: () => {
        this.recipeSaving = false;
        this.closeRecipe();
        this.list.load();
      },
      error: (err) => {
        this.recipeSaving = false;
        this.recipeError = err?.error?.message || 'تعذّر حفظ التركيبة.';
      },
    });
  }
}
