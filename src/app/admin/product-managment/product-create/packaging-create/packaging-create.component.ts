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

  loading = false;
  alert: AlertState = { show: false, type: '', message: '' };

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
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.alert = { show: false, type: '', message: '' };

    const formData = this.formHelperService.createFormData(this.form.value);

    this.productService.createPackaging(formData).subscribe({
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
}
