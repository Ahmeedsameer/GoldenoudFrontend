import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StockService } from '../../../../services/stock.service';
import { FormHelperService, AlertState } from '../../../../services/form-helper.service';
import { Supplier, Supply } from '../../../../models/stock.model';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { FormErrorComponent } from '../../../../form-error/form-error.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { BadgeComponent } from '../../../../shared/components/ui/badge/badge.component';

@Component({
  selector: 'app-supply-edit',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ComponentCardComponent,
    LabelComponent,
    ButtonComponent,
    LoadingComponent,
    FormErrorComponent,
  ],
  templateUrl: './supply-edit.component.html',
  styleUrl: './supply-form.component.css',
})
export class SupplyEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private stockService = inject(StockService);
  private formHelperService = inject(FormHelperService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  supplyId!: number;
  supply: Supply | null = null;
  suppliers: Supplier[] = [];
  loading = false;
  pageLoading = false;
  alert: AlertState = { show: false, type: '', message: '' };

  form: FormGroup = this.fb.group({
    supplier_id: [null, Validators.required],
    date: [{ value: '', disabled: true }],
    payment_method: ['immediate', Validators.required],
  });

  ngOnInit(): void {
    this.supplyId = Number(this.route.snapshot.paramMap.get('id'));
    this.pageLoading = true;
    this.stockService.getAllSuppliers().subscribe({
      next: (s) => { this.suppliers = s; },
      error: () => {},
    });
    this.stockService.getSupplyById(this.supplyId).subscribe({
      next: (res) => {
        this.supply = res.data || res;
        this.form.patchValue({
          supplier_id: this.supply!.supplier_id,
          date: this.supply!.date,
          payment_method: this.supply!.payment_method,
        });
        this.pageLoading = false;
      },
      error: () => { this.pageLoading = false; },
    });
  }

  setPaymentMethod(method: 'debt' | 'immediate') {
    this.form.get('payment_method')?.setValue(method);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.stockService.updateSupply(this.supplyId, this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard/stock/supplies/show', this.supplyId]);
      },
      error: (err) => {
        this.alert = this.formHelperService.handleBackendErrors(err, this.form);
        this.loading = false;
      },
    });
  }
}
