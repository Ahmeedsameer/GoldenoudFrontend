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
 * Compound Product — its own independent creation page (a perfume composed
 * fresh at sale time from whatever Oil + Bottle the cashier picks in the
 * Product Builder). Per the ERP spec this form carries ONLY Name, Barcode,
 * Selling Category, Selling Unit, and Default Essential Oil — absolutely no
 * inventory fields (no warning/critical level, no inventory unit choice, no
 * stock, no warehouse, no purchase cost, no supply fields), and no selling
 * price (that lives exclusively in Pricing Management's default_selling_price,
 * set after creation, never here).
 */
@Component({
  selector: 'app-compound-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonComponent, LoadingComponent, AlertComponent, ComponentCardComponent],
  templateUrl: './compound-create.component.html',
})
export class CompoundCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private formHelperService = inject(FormHelperService);
  private router = inject(Router);

  loading = false;
  alert: AlertState = { show: false, type: '', message: '' };

  categories: { id: number; name: string }[] = [];
  oilOptions: { id: number; name: string; sku: string | null }[] = [];

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    barcode: [''],
    category_id: [''],
    default_oil_id: [null],
  });

  ngOnInit(): void {
    this.categoryService.getCategories({ page: -1 }).subscribe({
      next: (res) => { this.categories = res.data || []; },
      error: () => {},
    });
    this.productService.getOilOptions().subscribe({
      next: (res) => { this.oilOptions = res.data || []; },
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

    this.productService.createCompound(formData).subscribe({
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
