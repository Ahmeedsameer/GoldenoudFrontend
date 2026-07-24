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
 * Raw Material — its own independent creation page (essential oils, alcohol,
 * fixatives, other raw ingredients). Per the ERP spec this form carries
 * ONLY identity + inventory-unit fields — no pricing, no capacity, no
 * catalog/image fields, nothing shared with the other 3 creation forms
 * (pricing is set exclusively in Pricing Management afterward).
 *
 * Inventory Unit is never "piece" for a raw material: Alcohol is measured
 * by volume (ml/L), everything else (oil, fixative, other raw ingredient)
 * by weight (g/kg). Whichever the admin picks, the larger unit (kg/L) is
 * normalized down to the base unit (g/ml) before submission — Product.scalar
 * must stay one of the two base units for the rest of the system (Supply
 * Wizard's purchase-unit conversion, in particular) to keep working exactly
 * as it already does; kg/L only ever exist as a data-entry convenience here.
 */
@Component({
  selector: 'app-raw-material-create',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonComponent, LoadingComponent, AlertComponent, ComponentCardComponent],
  templateUrl: './raw-material-create.component.html',
})
export class RawMaterialCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private formHelperService = inject(FormHelperService);
  private router = inject(Router);

  loading = false;
  alert: AlertState = { show: false, type: '', message: '' };

  categories: { id: number; name: string }[] = [];

  private readonly weightUnits = [
    { value: 'g', label: 'جرام' },
    { value: 'kg', label: 'كيلوجرام' },
  ];
  private readonly volumeUnits = [
    { value: 'ml', label: 'مليلتر' },
    { value: 'l', label: 'لتر' },
  ];

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    barcode: [''],
    category_id: ['', Validators.required],
    scalar: ['g', Validators.required],
    warning_quantity: [null, [Validators.min(0)]],
    critical_quantity: [null, [Validators.min(0)]],
  });

  ngOnInit(): void {
    this.categoryService.getCategories({ page: -1 }).subscribe({
      next: (res) => { this.categories = res.data || []; },
      error: () => {},
    });
  }

  /** Alcohol is the only Raw Material category measured by volume — every
   *  other raw material category (Essential Oil, Fixative, other Raw
   *  Ingredient) is measured by weight. Matches the same "كحول" identifier
   *  SalesService::searchAlcoholProducts() already uses. */
  get selectedCategoryIsAlcohol(): boolean {
    const id = +this.form.get('category_id')?.value;
    return this.categories.find((c) => c.id === id)?.name === 'كحول';
  }

  get unitOptions(): { value: string; label: string }[] {
    return this.selectedCategoryIsAlcohol ? this.volumeUnits : this.weightUnits;
  }

  /** Re-defaults the unit to the new category's family whenever the family
   *  actually changes (e.g. switching from an oil category to Alcohol), so
   *  the dropdown never shows a unit that doesn't belong to it. */
  onCategoryChange(): void {
    const options = this.unitOptions;
    const current = this.form.get('scalar')?.value;
    if (!options.some((o) => o.value === current)) {
      this.form.get('scalar')?.setValue(options[0].value);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.alert = { show: false, type: '', message: '' };

    // Normalize kg→g / l→ml before submission — the product's real inventory
    // unit (Product.scalar) is always the base unit; kg/L were only ever a
    // convenience choice on this form, never a distinct storage granularity.
    const value = { ...this.form.value };
    if (value.scalar === 'kg') value.scalar = 'g';
    if (value.scalar === 'l') value.scalar = 'ml';

    const formData = this.formHelperService.createFormData(value);

    this.productService.createRawMaterial(formData).subscribe({
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
