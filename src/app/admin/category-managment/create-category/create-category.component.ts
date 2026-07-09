import { Component, inject, OnInit } from '@angular/core';
import { LoadingComponent } from "../../../loading/loading.component";
import { ComponentCardComponent } from "../../../shared/components/common/component-card/component-card.component";
import { AlertComponent } from "../../../shared/components/ui/alert/alert.component";
import { LabelComponent } from "../../../shared/components/form/label/label.component";
import { InputFieldComponent } from "../../../shared/components/form/input/input-field.component";
import { FormErrorComponent } from "../../../form-error/form-error.component";
import { ButtonComponent } from "../../../shared/components/ui/button/button.component";
import { AlertState, FormHelperService } from '../../../services/form-helper.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TextAreaComponent } from "../../../shared/components/form/input/text-area.component";
import { FileInputComponent } from '../../../shared/components/form/input/file-input.component';
import { CategoryService } from '../../../services/category.service';

@Component({
  selector: 'app-create-category',
  imports: [LoadingComponent, ComponentCardComponent, AlertComponent, LabelComponent, InputFieldComponent, FormErrorComponent, ButtonComponent, ReactiveFormsModule, TextAreaComponent, FileInputComponent],
  templateUrl: './create-category.component.html',
  styleUrl: './create-category.component.css',
})
export class CreateCategoryComponent implements OnInit {
  alert: AlertState = { show: false, type: 'success', message: '' };
  selectedFile: File | null = null;
  loading: boolean = false;
  formBuilder: FormBuilder = inject(FormBuilder);
  formHelperService: FormHelperService = inject(FormHelperService);
  categoryService: CategoryService = inject(CategoryService);

  /** Product Types — the source of truth for which fields the form shows. */
  productTypes: { id: number; code: string; name: string; pricing_source?: string; sold_by?: string }[] = [];

  categoryForm: FormGroup = this.formBuilder.group({
    product_type_id: [null, Validators.required],
    name: ['', Validators.required],
    description: [''],
    image: [''],
    // Only the floor lives on the category. The per-gram price now lives on
    // each Product (configured in the product form), so it's no longer here.
    minimum_sell_price: [null],
  });

  /** The selected Product Type object. */
  get selectedType() {
    const id = +this.categoryForm.get('product_type_id')?.value;
    return this.productTypes.find(t => t.id === id) ?? null;
  }

  /** Oil-like type: pricing lives on the category (per gram). */
  get isOilType(): boolean {
    return this.selectedType?.pricing_source === 'category';
  }

  ngOnInit(): void {
    this.categoryService.getProductTypes().subscribe({
      next: (res) => { this.productTypes = res.data || []; },
      error: () => {},
    });

    // The Product Type decides which pricing fields are required — recompute
    // validators dynamically whenever it changes (no page reload).
    this.categoryForm.get('product_type_id')?.valueChanges.subscribe(() => this.applyTypeValidators());
  }

  private applyTypeValidators(): void {
    const min = this.categoryForm.get('minimum_sell_price');

    if (this.isOilType) {
      // The floor lives on the category; the per-gram price lives on each product.
      min?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      min?.clearValidators();
      min?.setValue(null);
    }
    min?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    const formData = this.formHelperService.createFormData(this.categoryForm.value, this.selectedFile, 'image');

    this.categoryService.createCategory(formData).subscribe({
      next: (response) => {
        this.alert = this.formHelperService.showSuccess('تم انشاء الفئه بنجاح');
        this.categoryForm.reset({ product_type_id: null, minimum_sell_price: null });
        this.loading = false;
      },
      error: (err) => {
        this.formHelperService.handleBackendErrors(err, this.categoryForm);
        this.loading = false;
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }
}
