import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ProductService } from '../../../services/product.service';
import { CategoryService } from '../../../services/category.service';
import { FormHelperService } from '../../../services/form-helper.service';
import { ListManager } from '../../../services/list-manager';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { LoadingComponent } from '../../../loading/loading.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { TableDropdownComponent } from '../../../shared/components/common/table-dropdown/table-dropdown.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ProductScalarPipe } from '../../../pips/product-scalar.pipe';

@Component({
  selector: 'app-product-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PaginationComponent,
    LoadingComponent,
    ButtonComponent,
    TableDropdownComponent,
    ModalComponent,
    AlertComponent,
    ProductScalarPipe,
  ],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css',
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private formHelperService = inject(FormHelperService);
  private fb = inject(FormBuilder);

  list = new ListManager<any>((params) => this.productService.getProducts(params));

  // ── Modal state ─────────────────────────────────────────
  showFormModal = false;
  isEditing = false;
  editingProduct: any = null;

  showDeleteModal = false;
  deletingProduct: any = null;

  // ── Recipe (BOM) editor state ───────────────────────────
  showRecipeModal = false;
  recipeProduct: any = null;
  recipeRows: { component_product_id: number; name: string; sku: string; quantity: number }[] = [];
  recipeSearch = '';
  recipeResults: any[] = [];
  recipeLoading = false;
  recipeSaving = false;
  recipeError = '';
  private recipeSearch$ = new Subject<string>();

  // ── Form state ──────────────────────────────────────────
  formLoading = false;
  deleteLoading = false;
  formError = '';
  selectedFile: File | null = null;
  currentImageUrl: string | null = null;

  // ── Reference data ──────────────────────────────────────
  categories: { id: number; name: string; is_fixed?: boolean; product_type?: { pricing_source?: string; sold_by?: string } }[] = [];

  scalarOptions = [
    { value: 'pcs', label: 'قطعة' },
    { value: 'kg',  label: 'كيلو جرام' },
    { value: 'g',   label: 'جرام' },
    { value: 'l',   label: 'لتر' },
    { value: 'ml',  label: 'ملليلتر' },
  ];

  productForm: FormGroup = this.fb.group({
    name:        ['', Validators.required],
    sku:         [''],
    barcode:     [''],
    description: [''],
    scalar:      ['pcs', Validators.required],
    category_id: [''],
    is_active:   [true],
    // Perfume management: per-product price + stock thresholds
    selling_price:     [null, [Validators.min(0)]],
    price_per_gram:    [null, [Validators.min(0)]],
    purchase_cost:     [null, [Validators.min(0)]],
    warning_quantity:  [null, [Validators.min(0)]],
    critical_quantity: [null, [Validators.min(0)]],
  });

  /** Live unit profit = selling − cost (null until both are set). */
  get formProfit(): number | null {
    const sell = this.productForm.get('selling_price')?.value;
    const cost = this.productForm.get('purchase_cost')?.value;
    if (sell === null || sell === '' || cost === null || cost === '') return null;
    return +(+sell - +cost).toFixed(2);
  }

  /** True when the selected category uses a fixed price (bottle-type). */
  get selectedCategoryIsFixed(): boolean {
    const id = +this.productForm.get('category_id')?.value;
    return this.categories.find(c => c.id === id)?.is_fixed === true;
  }

  /** True when the selected category is an oil type (price comes from the
   *  category per-gram, so the product has no selling-price field). */
  get selectedCategoryIsOil(): boolean {
    const id = +this.productForm.get('category_id')?.value;
    return this.categories.find(c => c.id === id)?.product_type?.pricing_source === 'category';
  }

  /** Dynamic label for the per-product price field, based on the category type. */
  get priceFieldLabel(): string {
    return this.selectedCategoryIsFixed ? 'سعر البيع الثابت (ج.م)' : 'سعر بيع الوحدة (ج.م)';
  }

  ngOnInit(): void {
    this.list.setLimitAndReload(30);
    this.loadCategories();

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

  loadCategories() {
    this.categoryService.getCategories({ page: -1 }).subscribe({
      next: (res) => { this.categories = res.data || []; },
      error: () => {},
    });
  }

  // ── Create ──────────────────────────────────────────────

  openCreate() {
    this.isEditing = false;
    this.editingProduct = null;
    this.selectedFile = null;
    this.currentImageUrl = null;
    this.formError = '';
    this.productForm.reset({
      name: '', sku: '', barcode: '', description: '',
      scalar: 'pcs', category_id: '', is_active: true,
      selling_price: null, price_per_gram: null, purchase_cost: null, warning_quantity: null, critical_quantity: null,
    });
    this.showFormModal = true;
  }

  // ── Edit ────────────────────────────────────────────────

  openEdit(product: any) {
    this.isEditing = true;
    this.editingProduct = product;
    this.selectedFile = null;
    this.currentImageUrl = product.image || null;
    this.formError = '';
    this.productForm.reset({
      name:        product.name        ?? '',
      sku:         product.sku         ?? '',
      barcode:     product.barcode     ?? '',
      description: product.description ?? '',
      scalar:      product.scalar      ?? 'pcs',
      category_id: product.category_id ?? product.category?.id ?? '',
      is_active:   product.is_active   !== undefined ? product.is_active : true,
      selling_price:     product.selling_price     ?? null,
      price_per_gram:    product.price_per_gram    ?? null,
      purchase_cost:     product.purchase_cost     ?? null,
      warning_quantity:  product.warning_quantity  ?? null,
      critical_quantity: product.critical_quantity ?? null,
    });
    this.showFormModal = true;
  }

  // ── Form submit (create or update) ──────────────────────

  onFormSubmit() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    this.formLoading = true;
    this.formError = '';

    const formData = this.formHelperService.createFormData(
      this.productForm.value,
      this.selectedFile,
      'image'
    );

    const request$ = this.isEditing
      ? this.productService.updateProduct(this.editingProduct.id, formData)
      : this.productService.createProduct(formData);

    request$.subscribe({
      next: () => {
        this.formLoading = false;
        this.showFormModal = false;
        this.list.load();
      },
      error: (err) => {
        this.formError = err?.error?.message || 'حدث خطأ غير متوقع.';
        this.formHelperService.handleBackendErrors(err, this.productForm);
        this.formLoading = false;
      },
    });
  }

  // ── Delete ──────────────────────────────────────────────

  openDelete(product: any) {
    this.deletingProduct = product;
    this.showDeleteModal = true;
  }

  onDelete() {
    if (!this.deletingProduct) return;
    this.deleteLoading = true;

    this.productService.deleteProduct(this.deletingProduct.id).subscribe({
      next: () => {
        this.deleteLoading = false;
        this.showDeleteModal = false;
        this.deletingProduct = null;
        this.list.load();
      },
      error: (err) => {
        this.deleteLoading = false;
        // Keep modal open so user sees the failure (could add a toast here)
        console.error('Delete failed', err);
      },
    });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.selectedFile = file;
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
      .map((r) => ({ component_product_id: r.component_product_id, quantity: +r.quantity }));

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
