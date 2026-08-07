import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService } from '../../../../services/product.service';
import { CategoryService } from '../../../../services/category.service';
import { FormHelperService, AlertState } from '../../../../services/form-helper.service';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';

/**
 * Packaging — its own independent creation page (bottles, boxes, wrapping).
 * Per the ERP spec this form carries ONLY identity + capacity + inventory-unit
 * fields — no pricing (set exclusively in Pricing Management). Inventory Unit
 * is always "Piece", shown as a fixed, non-editable value — never a dropdown.
 */
@Component({
  selector: 'app-packaging-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonComponent, LoadingComponent, AlertComponent, ComponentCardComponent],
  templateUrl: './packaging-create.component.html',
})
export class PackagingCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private formHelperService = inject(FormHelperService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = false;
  pageLoading = false;
  alert: AlertState = { show: false, type: '', message: '' };
  selectedFile: File | null = null;
  currentImageUrl: string | null = null;

  productId: number | null = null;
  isEdit = false;

  categories: { id: number; name: string }[] = [];

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    barcode: [''],
    category_id: ['', Validators.required],
    capacity_ml: [null, [Validators.min(0.001)]],
    warning_quantity: [null, [Validators.min(0)]],
    critical_quantity: [null, [Validators.min(0)]],
  });

  ngOnInit(): void {
    this.categoryService.getCategories({ page: -1 }).subscribe({
      next: (res) => { this.categories = res.data || []; },
      error: () => {},
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.productId = +id;
      this.pageLoading = true;
      this.productService.getProductById(this.productId).subscribe({
        next: (res) => {
          const product = res.data || res;
          this.form.patchValue({
            name: product.name ?? '',
            barcode: product.barcode ?? '',
            category_id: product.category_id ?? '',
            capacity_ml: product.capacity_ml ?? null,
            warning_quantity: product.warning_quantity ?? null,
            critical_quantity: product.critical_quantity ?? null,
          });
          this.currentImageUrl = product.image || null;
          this.pageLoading = false;
        },
        error: () => { this.pageLoading = false; },
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.alert = { show: false, type: '', message: '' };

    const formData = this.formHelperService.createFormData(this.form.value, this.selectedFile, 'image');

    const request = this.isEdit
      ? this.productService.updateProduct(this.productId!, formData)
      : this.productService.createPackaging(formData);

    request.subscribe({
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
