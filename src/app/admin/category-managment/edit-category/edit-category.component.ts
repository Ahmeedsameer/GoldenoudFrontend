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
import { Option, SelectComponent } from '../../../shared/components/form/select/select.component';
import { CategoryService } from '../../../services/category.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';




@Component({
  selector: 'app-edit-category',
  imports: [LoadingComponent, ComponentCardComponent, AlertComponent, LabelComponent, InputFieldComponent, FormErrorComponent, ButtonComponent, ReactiveFormsModule, TextAreaComponent, FileInputComponent, SelectComponent,ModalComponent],
  templateUrl: './edit-category.component.html',
  // styleUrl: './edit-category.component.css',
})
export class EditCategoryComponent implements OnInit{
  alert: AlertState = { show: false, type: 'success', message: '' };
  loading: boolean = false;
  parentCategories: Option[] = [];
  categoryId: number = 0;
  formBuilder: FormBuilder = inject(FormBuilder);
  formHelperService: FormHelperService = inject(FormHelperService);
  categoryService: CategoryService = inject(CategoryService);
  router: Router = inject(Router);
  route: ActivatedRoute = inject(ActivatedRoute);
  fileToUpload: File | null = null;
  imageUrl: string | null = null;
  showImageModal: boolean = false;
  
  categoryForm: FormGroup = this.formBuilder.group({
    name: ['', Validators.required],
    parent_id: [''],
    description: [''],
    image: [''],
    minimum_sell_price: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.categoryId = this.route.snapshot.params['id'];
    this.loadParentCategories();
    this.loadCategory();
  }

  loadCategory() {
    this.loading = true;
    this.categoryService.getCategoryById(this.categoryId).subscribe({
      next: (response) => {
        let data = response.data;
        this.categoryForm.patchValue({
          name: data.name,
          parent_id: data.parent_id || '',
          description: data.description || '',
          minimum_sell_price: data.minimum_sell_price ?? 0,
        });
        this.imageUrl = data.image || null;
        this.loading = false;
      
      },
      
      error: (err) => {
        console.log(err);
        this.loading = false;
      }
    });
  }

  loadParentCategories() {
    this.categoryService.getCategories({ page: -1, type: 'main' }).subscribe({
      next: (response) => {

        this.parentCategories = response.data.map((category: any) => ({
          value: category.id,
          label: category.name
        }));

     
      },
      error: (err) => {
        console.log(err);
      }
    });
  }

  onSubmit() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    
    this.loading = true;
    const formData = this.formHelperService.createFormData(this.categoryForm.value, this.fileToUpload, 'image');
    
    this.categoryService.updateCategory(this.categoryId, formData).subscribe({
      next: (response) => {
        this.alert = this.formHelperService.showSuccess('تم تحديث الفئه بنجاح');
        this.loading = false;
        this.loadCategory();
        this.loadParentCategories();
       
      },
      error: (err) => {
        this.formHelperService.handleBackendErrors(err, this.categoryForm);
        this.loading = false;
      }
    });
  }


  imageSelected(event: any) {
    let file = event.target.files[0];
    if(file){
      this.fileToUpload = file;
    }
  }
}
