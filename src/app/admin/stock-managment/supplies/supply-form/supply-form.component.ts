import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, map, takeUntil } from 'rxjs';
import { StockService } from '../../../../services/stock.service';
import { ProductService } from '../../../../services/product.service';
import { FormHelperService, AlertState } from '../../../../services/form-helper.service';
import { Supplier } from '../../../../models/stock.model';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { FormErrorComponent } from '../../../../form-error/form-error.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { HighlightPipe } from '../../../../shared/pipe/highlight.pipe';

type Step = 1 | 2;

@Component({
  selector: 'app-supply-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ComponentCardComponent,
    LabelComponent,
    ButtonComponent,
    LoadingComponent,
    FormErrorComponent,
    HighlightPipe,
  ],
  templateUrl: './supply-form.component.html',
  styleUrl: './supply-form.component.css',
})
export class SupplyFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private stockService = inject(StockService);
  private productService = inject(ProductService);
  private formHelperService = inject(FormHelperService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  step: Step = 1;
  loading = false;
  alert: AlertState = { show: false, type: '', message: '' };

  // Supplier typeahead
  supplierQuery = '';
  supplierResults: Supplier[] = [];
  showSupplierDropdown = false;
  private supplierSearch$ = new Subject<string>();

  // Per-row product typeahead
  productQueries: string[] = [];
  productResults: any[][] = [];
  showProductDropdown: boolean[] = [];
  private productSearchSubjects: Subject<string>[] = [];

  headerForm: FormGroup = this.fb.group({
    supplier_id: [null, Validators.required],
    date: ['', Validators.required],
    payment_method: ['immediate', Validators.required],
  });

  itemsForm: FormGroup = this.fb.group({
    items: this.fb.array([]),
  });

  get items(): FormArray {
    return this.itemsForm.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.supplierSearch$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q) =>
        q.trim().length === 0
          ? of([])
          : this.stockService.getSuppliers({ search: q, per_page: 10 }).pipe(
              map((res) => (res.data || []) as Supplier[])
            )
      ),
      takeUntil(this.destroy$),
    ).subscribe((results) => {
      this.supplierResults = results;
      this.showSupplierDropdown = results.length > 0;
    });

    this.addItem();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.productSearchSubjects.forEach((s) => s.complete());
  }

  // ── Supplier typeahead ──────────────────────────────────

  onSupplierInput(value: string) {
    this.supplierQuery = value;
    this.headerForm.get('supplier_id')?.setValue(null);
    this.supplierSearch$.next(value);
  }

  selectSupplier(supplier: Supplier) {
    this.supplierQuery = supplier.name;
    this.headerForm.get('supplier_id')?.setValue(supplier.id);
    this.showSupplierDropdown = false;
    this.supplierResults = [];
  }

  closeSupplierDropdown() {
    setTimeout(() => { this.showSupplierDropdown = false; }, 200);
  }

  // ── Product typeahead (per row) ─────────────────────────

  addItem() {
    const index = this.items.length;
    const itemGroup = this.fb.group({
      product_id: [null, Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.001)]],
      unit_price: [null, [Validators.required, Validators.min(0)]],
    });
    this.items.push(itemGroup);
    this.productQueries.push('');
    this.productResults.push([]);
    this.showProductDropdown.push(false);

    const subject = new Subject<string>();
    this.productSearchSubjects.push(subject);

    subject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q) =>
        q.trim().length === 0
          ? of([])
          : this.productService.getProducts({ search: q, per_page: 10 }).pipe(
              map((res) => res.data || [])
            )
      ),
      takeUntil(this.destroy$),
    ).subscribe((results) => {
      this.productResults[index] = results;
      this.showProductDropdown[index] = results.length > 0;
    });
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.productQueries.splice(index, 1);
      this.productResults.splice(index, 1);
      this.showProductDropdown.splice(index, 1);
      const subj = this.productSearchSubjects.splice(index, 1)[0];
      subj.complete();
    }
  }

  onProductInput(index: number, value: string) {
    this.productQueries[index] = value;
    this.items.at(index).get('product_id')?.setValue(null);
    this.productSearchSubjects[index].next(value);
  }

  selectProduct(index: number, product: any) {
    this.productQueries[index] = product.name;
    this.items.at(index).get('product_id')?.setValue(product.id);
    this.showProductDropdown[index] = false;
    this.productResults[index] = [];
  }

  closeProductDropdown(index: number) {
    setTimeout(() => { this.showProductDropdown[index] = false; }, 200);
  }

  // ── Totals ─────────────────────────────────────────────

  rowTotal(index: number): number {
    const row = this.items.at(index).value;
    return (row.quantity || 0) * (row.unit_price || 0);
  }

  grandTotal(): number {
    return this.items.controls.reduce((sum, _, i) => sum + this.rowTotal(i), 0);
  }

  // ── Step navigation ────────────────────────────────────

  goToStep2() {
    if (this.headerForm.invalid) {
      this.headerForm.markAllAsTouched();
      return;
    }
    this.step = 2;
  }

  goBack() {
    this.step = 1;
  }

  setPaymentMethod(method: 'debt' | 'immediate') {
    this.headerForm.get('payment_method')?.setValue(method);
  }

  // ── Submit ─────────────────────────────────────────────

  onSubmit() {
    if (this.itemsForm.invalid) {
      this.itemsForm.markAllAsTouched();
      return;
    }
    if (this.items.length === 0) {
      this.alert = { show: true, type: 'error', message: 'يجب إضافة صنف واحد على الأقل.' };
      return;
    }
    this.loading = true;
    this.alert = { show: false, type: '', message: '' };

    const payload = {
      ...this.headerForm.value,
      items: this.items.value,
    };

    this.stockService.createSupply(payload).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard/stock']);
      },
      error: (err) => {
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'حدث خطأ غير متوقع.' };
        this.loading = false;
      },
    });
  }
}
