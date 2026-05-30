import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { SalesService } from '../../services/sales.service';
import { Customer, GoodsSearchResult, PriceViolation, TesterUser } from '../../models/sales.model';
import { ButtonComponent } from '../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../loading/loading.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { LabelComponent } from '../../shared/components/form/label/label.component';
import { ComponentCardComponent } from '../../shared/components/common/component-card/component-card.component';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';

const LAYOUT_KEY = 'cashier_layout';
type LayoutMode = 'form' | 'pos';

@Component({
  selector: 'app-cashier',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ComponentCardComponent,
    LabelComponent,
    ButtonComponent,
    LoadingComponent,
    AlertComponent,
    ModalComponent,
  ],
  templateUrl: './cashier.component.html',
  styleUrl: './cashier.component.css',
})
export class CashierComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private salesService = inject(SalesService);
  private destroy$ = new Subject<void>();

  isSubmitting = false;
  alert: { show: boolean; type: 'success' | 'error' | ''; message: string } = {
    show: false, type: '', message: '',
  };

  // ── Layout toggle ───────────────────────────────────────
  layoutMode: LayoutMode = (localStorage.getItem(LAYOUT_KEY) as LayoutMode) || 'form';

  toggleLayout() {
    this.layoutMode = this.layoutMode === 'form' ? 'pos' : 'form';
    localStorage.setItem(LAYOUT_KEY, this.layoutMode);
  }

  // ── Customer typeahead ──────────────────────────────────
  customerQuery = '';
  customerResults: Customer[] = [];
  showCustomerDropdown = false;
  private customerSearch$ = new Subject<string>();

  // ── Tester typeahead ────────────────────────────────────
  testerQuery = '';
  testerResults: TesterUser[] = [];
  showTesterDropdown = false;
  selectedTester: TesterUser | null = null;
  private testerSearch$ = new Subject<string>();

  // ── Price violation warning ─────────────────────────────
  showViolationModal = false;
  priceViolations: PriceViolation[] = [];
  private pendingPayload: any = null;

  // ── Header form ─────────────────────────────────────────
  form: FormGroup = this.fb.group({
    phone: ['', Validators.required],
    name:  ['', Validators.required],
    tester_id: [null],
    date: [this.getToday(), Validators.required],
    price_type: ['retail', Validators.required],
  });

  // ── Items FormArray ─────────────────────────────────────
  items: FormArray = this.fb.array([]);

  productQueries: string[] = [];
  productResults: GoodsSearchResult[][] = [];
  showProductDropdown: boolean[] = [];
  selectedGoods: (GoodsSearchResult | null)[] = [];
  private productSearchSubjects: Subject<string>[] = [];

  // ── Lifecycle ───────────────────────────────────────────

  ngOnInit(): void {
    this.customerSearch$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q) => q.trim().length < 3 ? of([]) : this.salesService.searchCustomers(q)),
      takeUntil(this.destroy$),
    ).subscribe((results) => {
      this.customerResults = results;
      this.showCustomerDropdown = results.length > 0;
    });

    this.testerSearch$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q) => q.trim().length === 0 ? of([]) : this.salesService.searchTesters(q)),
      takeUntil(this.destroy$),
    ).subscribe((results) => {
      this.testerResults = results;
      this.showTesterDropdown = results.length > 0;
    });

    this.addItem();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.productSearchSubjects.forEach((s) => s.complete());
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ── Customer section ────────────────────────────────────

  onPhoneInput(value: string) {
    this.customerQuery = value;
    this.form.get('phone')?.setValue(value);
    this.customerSearch$.next(value);
  }

  selectCustomer(customer: Customer) {
    this.customerQuery = customer.phone;
    this.form.get('phone')?.setValue(customer.phone);
    this.form.get('name')?.setValue(customer.name);
    this.showCustomerDropdown = false;
    this.customerResults = [];
  }

  closeCustomerDropdown() {
    setTimeout(() => { this.showCustomerDropdown = false; }, 200);
  }

  // ── Tester section ──────────────────────────────────────

  onTesterInput(value: string) {
    this.testerQuery = value;
    this.selectedTester = null;
    this.form.get('tester_id')?.setValue(null);
    this.testerSearch$.next(value);
  }

  selectTester(tester: TesterUser) {
    this.selectedTester = tester;
    this.testerQuery = tester.name;
    this.form.get('tester_id')?.setValue(tester.id);
    this.showTesterDropdown = false;
    this.testerResults = [];
  }

  clearTester() {
    this.selectedTester = null;
    this.testerQuery = '';
    this.form.get('tester_id')?.setValue(null);
    this.showTesterDropdown = false;
  }

  closeTesterDropdown() {
    setTimeout(() => { this.showTesterDropdown = false; }, 200);
  }

  // ── Price type ──────────────────────────────────────────

  setPriceType(type: 'retail' | 'wholesale') {
    this.form.get('price_type')?.setValue(type);
  }

  // ── Items ───────────────────────────────────────────────

  addItem() {
    const index = this.items.length;
    const group = this.fb.group({
      product_id: [null, Validators.required],
      quantity:   [null, [Validators.required, Validators.min(1)]],
      price:      [null, [Validators.required, Validators.min(0)]],
    });
    this.items.push(group);
    this.productQueries.push('');
    this.productResults.push([]);
    this.showProductDropdown.push(false);
    this.selectedGoods.push(null);

    const subject = new Subject<string>();
    this.productSearchSubjects.push(subject);

    subject.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap((q) => q.trim().length === 0 ? of([]) : this.salesService.searchGoods(q)),
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
      this.selectedGoods.splice(index, 1);
      const subj = this.productSearchSubjects.splice(index, 1)[0];
      subj.complete();
    }
  }

  onProductInput(index: number, value: string) {
    this.productQueries[index] = value;
    this.items.at(index).get('product_id')?.setValue(null);
    this.selectedGoods[index] = null;
    this.productSearchSubjects[index].next(value);
  }

  selectProduct(index: number, goods: GoodsSearchResult) {
    this.productQueries[index] = goods.supply_item.product.name;
    this.items.at(index).get('product_id')?.setValue(goods.supply_item.product.id);
    this.selectedGoods[index] = goods;
    this.showProductDropdown[index] = false;
    this.productResults[index] = [];
  }

  closeProductDropdown(index: number) {
    setTimeout(() => { this.showProductDropdown[index] = false; }, 200);
  }

  isQtyExceeded(index: number): boolean {
    const goods = this.selectedGoods[index];
    if (!goods) return false;
    const qty = this.items.at(index).get('quantity')?.value;
    return qty > goods.current_quantity;
  }

  /** True when price entered is below the category minimum */
  isPriceViolation(index: number): boolean {
    const goods = this.selectedGoods[index];
    const min = goods?.supply_item?.product?.category?.minimum_sell_price;
    if (min == null || min <= 0) return false;
    const price = this.items.at(index).get('price')?.value;
    return price != null && +price < +min;
  }

  // ── Totals ──────────────────────────────────────────────

  rowTotal(index: number): number {
    const row = this.items.at(index).value;
    return (row.quantity || 0) * (row.price || 0);
  }

  grandTotal(): number {
    return this.items.controls.reduce((sum, _, i) => sum + this.rowTotal(i), 0);
  }

  // ── Submit ──────────────────────────────────────────────

  onSubmit() {
    this.form.markAllAsTouched();
    this.items.controls.forEach((c) => (c as FormGroup).markAllAsTouched());

    if (this.form.invalid) {
      const missing: string[] = [];
      if (this.form.get('phone')?.invalid) missing.push('رقم الهاتف');
      if (this.form.get('name')?.invalid)  missing.push('اسم العميل');
      if (this.form.get('date')?.invalid)  missing.push('التاريخ');
      this.alert = {
        show: true, type: 'error',
        message: `يرجى ملء الحقول المطلوبة: ${missing.join('، ')}.`,
      };
      return;
    }

    if (this.items.invalid) {
      this.alert = {
        show: true, type: 'error',
        message: 'يرجى التأكد من اختيار المنتج وإدخال الكمية والسعر لجميع الأصناف.',
      };
      return;
    }

    for (let i = 0; i < this.items.length; i++) {
      if (this.isQtyExceeded(i)) {
        this.alert = {
          show: true, type: 'error',
          message: `الكمية المطلوبة في الصنف ${i + 1} تتجاوز الكمية المتاحة.`,
        };
        return;
      }
    }

    const payload = {
      ...this.form.value,
      items: this.items.value.map((item: any) => ({
        product_id: item.product_id,
        quantity:   item.quantity,
        price:      item.price,
      })),
    };

    // Check for price violations (price < category minimum_sell_price)
    const violations: PriceViolation[] = [];
    for (let i = 0; i < this.items.length; i++) {
      const goods = this.selectedGoods[i];
      const min = goods?.supply_item?.product?.category?.minimum_sell_price;
      const price = this.items.at(i).get('price')?.value;
      if (min != null && min > 0 && price != null && +price < +min) {
        violations.push({
          index: i,
          productName: goods!.supply_item.product.name,
          enteredPrice: +price,
          minimumPrice: +min,
        });
      }
    }

    if (violations.length > 0) {
      this.priceViolations = violations;
      this.pendingPayload = payload;
      this.showViolationModal = true;
      return;
    }

    this.doSubmit(payload);
  }

  /** Called when user confirms to proceed despite price violations */
  confirmWithViolations() {
    this.showViolationModal = false;
    if (this.pendingPayload) {
      this.doSubmit(this.pendingPayload);
      this.pendingPayload = null;
    }
  }

  private doSubmit(payload: any) {
    this.isSubmitting = true;
    this.alert = { show: false, type: '', message: '' };

    this.salesService.createInvoice(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        const ref = res?.data?.invoice_number
          ? ` رقم ${res.data.invoice_number}`
          : res?.data?.id ? ` #${res.data.id}` : '';
        this.alert = {
          show: true, type: 'success',
          message: `تم إنشاء الفاتورة${ref} بنجاح.`,
        };
        this.resetForm();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.alert = {
          show: true, type: 'error',
          message: err?.error?.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        };
      },
    });
  }

  private resetForm() {
    this.customerQuery = '';
    this.testerQuery = '';
    this.selectedTester = null;
    this.priceViolations = [];
    this.pendingPayload = null;
    this.form.reset({
      phone: '', name: '', tester_id: null,
      date: this.getToday(), price_type: 'retail',
    });
    while (this.items.length) { this.items.removeAt(0); }
    this.productSearchSubjects.forEach((s) => s.complete());
    this.productQueries = [];
    this.productResults = [];
    this.showProductDropdown = [];
    this.selectedGoods = [];
    this.productSearchSubjects = [];
    this.addItem();
  }
}
