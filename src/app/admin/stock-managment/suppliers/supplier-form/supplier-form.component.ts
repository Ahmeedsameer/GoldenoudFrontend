import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StockService } from '../../../../services/stock.service';
import { FormHelperService, AlertState } from '../../../../services/form-helper.service';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { FormErrorComponent } from '../../../../form-error/form-error.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';

@Component({
  selector: 'app-supplier-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ComponentCardComponent,
    InputFieldComponent,
    LabelComponent,
    ButtonComponent,
    LoadingComponent,
    AlertComponent,
    FormErrorComponent,
  ],
  templateUrl: './supplier-form.component.html',
  styleUrl: './supplier-form.component.css',
})
export class SupplierFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private stockService = inject(StockService);
  private formHelperService = inject(FormHelperService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  supplierId: number | null = null;
  isEdit = false;
  loading = false;
  pageLoading = false;
  alert: AlertState = { show: false, type: '', message: '' };

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
  });

  ngOnInit(): void {
    this.supplierId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.supplierId;
    if (this.isEdit) {
      this.loadSupplier();
    }
  }

  loadSupplier() {
    this.pageLoading = true;
    this.stockService.getSupplierById(this.supplierId!).subscribe({
      next: (res) => {
        const supplier = res.data || res;
        this.form.patchValue({ name: supplier.name, phone: supplier.phone });
        this.pageLoading = false;
      },
      error: () => { this.pageLoading = false; },
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const request = this.isEdit
      ? this.stockService.updateSupplier(this.supplierId!, this.form.value)
      : this.stockService.createSupplier(this.form.value);

    request.subscribe({
      next: () => {
        this.loading = false;
        if (this.isEdit) {
          this.router.navigate(['/dashboard/stock']);
        } else {
          this.form.reset();
          this.alert = { show: true, type: 'success', message: 'تم إضافة المورد بنجاح.' };
        }
      },
      error: (err) => {
        this.alert = this.formHelperService.handleBackendErrors(err, this.form);
        this.loading = false;
      },
    });
  }
}
