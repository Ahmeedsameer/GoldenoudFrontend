import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ListManager } from '../../../services/list-manager';
import { HrService } from '../../../services/hr.service';
import { ShopService } from '../../../services/shop.service';
import { FormHelperService } from '../../../services/form-helper.service';
import { PaginationComponent } from '../../../pagination/pagination.component';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { DatePickerComponent } from '../../../shared/components/form/date-picker/date-picker.component';

@Component({
  selector: 'app-hr-transfers',
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent, LoadingComponent, ModalComponent, DatePickerComponent],
  templateUrl: './hr-transfers.component.html',
})
export class HrTransfersComponent implements OnInit {
  private hr = inject(HrService);
  private shopService = inject(ShopService);
  private formHelper = inject(FormHelperService);
  private fb = inject(FormBuilder);

  list = new ListManager<any>((params) => this.hr.getTransfers(params));

  shops: { id: number; name: string }[] = [];
  employees: { id: number; name: string; shop_id: number | null }[] = [];

  showModal = false;
  formLoading = false;
  formError = '';
  actionBusyId: number | null = null;

  statusTabs = [
    { value: '', label: 'الكل' },
    { value: 'draft', label: 'مسودّة' },
    { value: 'scheduled', label: 'مجدول' },
    { value: 'active', label: 'نشط' },
    { value: 'completed', label: 'مكتمل' },
    { value: 'cancelled', label: 'ملغي' },
  ];
  activeStatus = '';

  statusMeta: Record<string, { label: string; cls: string }> = {
    draft:     { label: 'مسودّة',  cls: 'bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300' },
    scheduled: { label: 'مجدول',   cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
    active:    { label: 'نشط',     cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' },
    completed: { label: 'مكتمل',   cls: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400' },
    cancelled: { label: 'ملغي',    cls: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' },
  };

  form: FormGroup = this.fb.group({
    user_id:             [null, Validators.required],
    temporary_branch_id: [null, Validators.required],
    start_date:          ['', Validators.required],
    end_date:            ['', Validators.required],
    reason:              [''],
    notes:               [''],
  });

  ngOnInit(): void {
    this.list.setLimitAndReload(20);
    this.shopService.getShops({ page: -1 }).subscribe({
      next: (res) => { this.shops = res.data?.data || res.data || res || []; },
      error: () => {},
    });
    this.hr.getEmployees({ limit: 200 }).subscribe({
      next: (res) => {
        const rows = res.data?.data || res.data || [];
        this.employees = rows.map((e: any) => ({ id: e.id, name: e.name, shop_id: e.shop_id }));
      },
      error: () => {},
    });
  }

  setStatus(value: string) {
    this.activeStatus = value;
    this.list.setFilter('status', value || undefined);
  }

  openCreate() {
    this.formError = '';
    this.form.reset({ user_id: null, temporary_branch_id: null, start_date: '', end_date: '', reason: '', notes: '' });
    this.showModal = true;
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.formLoading = true;
    this.formError = '';
    this.hr.createTransfer(this.form.value).subscribe({
      next: () => { this.formLoading = false; this.showModal = false; this.list.load(); },
      error: (err) => {
        this.formError = err?.error?.message || this.firstError(err) || 'حدث خطأ غير متوقع.';
        this.formHelper.handleBackendErrors(err, this.form);
        this.formLoading = false;
      },
    });
  }

  approve(t: any) {
    this.actionBusyId = t.id;
    this.hr.approveTransfer(t.id).subscribe({
      next: () => { this.actionBusyId = null; this.list.load(); },
      error: (err) => { this.actionBusyId = null; alert(err?.error?.message || 'تعذّر الاعتماد'); },
    });
  }

  cancel(t: any) {
    this.actionBusyId = t.id;
    this.hr.cancelTransfer(t.id).subscribe({
      next: () => { this.actionBusyId = null; this.list.load(); },
      error: (err) => { this.actionBusyId = null; alert(err?.error?.message || 'تعذّر الإلغاء'); },
    });
  }

  private firstError(err: any): string | null {
    const e = err?.error?.errors;
    if (e) { const k = Object.keys(e)[0]; return k ? e[k][0] : null; }
    return null;
  }
}
