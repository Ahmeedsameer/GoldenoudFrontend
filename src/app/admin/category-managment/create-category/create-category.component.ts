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
import { SwitchComponent } from '../../../shared/components/form/input/switch.component';
import { CategoryService } from '../../../services/category.service';

@Component({
  selector: 'app-create-category',
  imports: [LoadingComponent, ComponentCardComponent, AlertComponent, LabelComponent, InputFieldComponent, FormErrorComponent, ButtonComponent, ReactiveFormsModule, TextAreaComponent, FileInputComponent, SwitchComponent],
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
  categoryForm: FormGroup = this.formBuilder.group({
    name: ['', Validators.required],
    description: [''],
    image: [''],
    minimum_sell_price: [0, [Validators.required, Validators.min(0)]],
    is_fixed: [false],
    value_percentage: [null],
  });

  get isFixed(): boolean {
    return !!this.categoryForm.get('is_fixed')?.value;
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
        this.categoryForm.reset({ minimum_sell_price: 0, is_fixed: false, value_percentage: null });
        this.loading = false;
      },
      error: (err) => {
        this.formHelperService.handleBackendErrors(err, this.categoryForm);
        this.loading = false;
      }
    });
  }

  ngOnInit(): void {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }
}
