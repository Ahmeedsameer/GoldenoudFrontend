import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../../../services/product.service';
import { CategoryService } from '../../../../services/category.service';
import { FormHelperService, AlertState } from '../../../../services/form-helper.service';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';

/**
 * Ready Product — its own independent creation page (pre-bottled perfumes
 * sold directly, exactly as-is — no assembly). Per the ERP spec this form
 * carries identity + inventory-unit fields plus an optional image (shown in
 * the Sales Catalog) — no pricing (Pricing Management only), no
 * catalog-visibility toggle (the products table's `show_in_catalog` column
 * already defaults to true).
 */
@Component({
  selector: 'app-ready-product-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonComponent, LoadingComponent, AlertComponent, ComponentCardComponent],
  templateUrl: './ready-product-create.component.html',
})
export class ReadyProductCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private formHelperService = inject(FormHelperService);
  private router = inject(Router);

  loading = false;
  alert: AlertState = { show: false, type: '', message: '' };
  selectedFile: File | null = null;

  categories: { id: number; name: string }[] = [];

  /** Piece, or weighed by gram/kilogram. Kilogram is normalized to gram
   *  before submission — same "base unit only" rule as Raw Material. */
  unitOptions = [
    { value: 'pcs', label: 'قطعة' },
    { value: 'g', label: 'جرام' },
    { value: 'kg', label: 'كيلوجرام' },
  ];

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    barcode: [''],
    category_id: ['', Validators.required],
    scalar: ['pcs', Validators.required],
    warning_quantity: [null, [Validators.min(0)]],
    critical_quantity: [null, [Validators.min(0)]],
  });

  ngOnInit(): void {
    this.categoryService.getCategories({ page: -1 }).subscribe({
      next: (res) => { this.categories = res.data || []; },
      error: () => {},
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.alert = { show: false, type: '', message: '' };

    const value = { ...this.form.value };
    if (value.scalar === 'kg') value.scalar = 'g';

    const formData = this.formHelperService.createFormData(value, this.selectedFile, 'image');

    this.productService.createReadyProduct(formData).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard/products']);
      },
      error: (err) => {
        this.loading = false;
        this.alert = this.formHelperService.handleBackendErrors(err, this.form);
      },
    });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.selectedFile = file;
  }
}
