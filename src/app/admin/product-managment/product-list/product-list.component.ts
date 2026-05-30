import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

  // ── Form state ──────────────────────────────────────────
  formLoading = false;
  deleteLoading = false;
  formError = '';
  selectedFile: File | null = null;
  currentImageUrl: string | null = null;

  // ── Reference data ──────────────────────────────────────
  categories: { id: number; name: string }[] = [];

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
  });

  ngOnInit(): void {
    this.list.setLimitAndReload(30);
    this.loadCategories();
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
}
