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

@Component({
  selector: 'app-hr-employees',
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent, LoadingComponent, ModalComponent],
  templateUrl: './hr-employees.component.html',
})
export class HrEmployeesComponent implements OnInit {
  private hr = inject(HrService);
  private shopService = inject(ShopService);
  private formHelper = inject(FormHelperService);
  private fb = inject(FormBuilder);

  list = new ListManager<any>((params) => this.hr.getEmployees(params));

  shops: { id: number; name: string }[] = [];

  showModal = false;
  isEditing = false;
  editingId: number | null = null;
  formLoading = false;
  formError = '';

  roleOptions = [
    { value: 'sales', label: 'مبيعات' },
    { value: 'manager', label: 'مدير فرع' },
  ];

  form: FormGroup = this.fb.group({
    name:                        ['', Validators.required],
    email:                       ['', [Validators.required, Validators.email]],
    password:                    ['', [Validators.required, Validators.minLength(6)]],
    phone:                       [''],
    role:                        ['sales', Validators.required],
    status:                      ['active'],
    base_salary:                 [0, [Validators.min(0)]],
    personal_commission_percent: [0, [Validators.min(0), Validators.max(100)]],
    hire_date:                   [''],
    monthly_leave_allowance:      [2, [Validators.min(0), Validators.max(365)]],
    shop_id:                     [null, Validators.required],
    hr_notes:                    [''],
  });

  ngOnInit(): void {
    this.list.setLimitAndReload(20);
    this.loadShops();
  }

  loadShops() {
    this.shopService.getShops({ page: -1 }).subscribe({
      next: (res) => { this.shops = res.data?.data || res.data || res || []; },
      error: () => {},
    });
  }

  setSearch(value: string) { this.list.setFilter('search', value); }
  setRoleFilter(value: string) { this.list.setFilter('role', value || undefined); }
  setStatusFilter(value: string) { this.list.setFilter('status', value || undefined); }

  shopName(id: number): string {
    return this.shops.find((s) => s.id === id)?.name || `#${id}`;
  }

  // ── Create ───────────────────────────────────────────────
  openCreate() {
    this.isEditing = false;
    this.editingId = null;
    this.formError = '';
    this.form.reset({
      name: '', email: '', password: '', phone: '', role: 'sales', status: 'active',
      base_salary: 0, personal_commission_percent: 0,
      hire_date: '', monthly_leave_allowance: 2, shop_id: null, hr_notes: '',
    });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.showModal = true;
  }

  // ── Edit ─────────────────────────────────────────────────
  openEdit(emp: any) {
    this.isEditing = true;
    this.editingId = emp.id;
    this.formError = '';

    this.hr.getEmployee(emp.id).subscribe({
      next: (res) => {
        const e = res.data?.employee ?? emp;
        this.form.reset({
          name: e.name ?? '',
          email: e.email ?? '',
          password: '',
          phone: e.phone ?? '',
          role: e.role ?? 'sales',
          status: e.status ?? 'active',
          base_salary: e.base_salary ?? 0,
          personal_commission_percent: e.personal_commission_percent ?? 0,
          hire_date: e.hire_date ? String(e.hire_date).substring(0, 10) : '',
          monthly_leave_allowance: e.monthly_leave_allowance ?? 2,
          shop_id: e.shop_id ?? null,
          hr_notes: e.hr_notes ?? '',
        });
        // password optional on edit
        this.form.get('password')?.clearValidators();
        this.form.get('password')?.updateValueAndValidity();
      },
      error: () => {},
    });
    this.showModal = true;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.formLoading = true;
    this.formError = '';

    const raw = this.form.value;
    const payload: any = { ...raw };
    if (this.isEditing && !payload.password) delete payload.password;

    const req$ = this.isEditing
      ? this.hr.updateEmployee(this.editingId!, payload)
      : this.hr.createEmployee(payload);

    req$.subscribe({
      next: () => {
        this.formLoading = false;
        this.showModal = false;
        this.list.load();
      },
      error: (err) => {
        this.formError = err?.error?.message || 'حدث خطأ غير متوقع.';
        this.formHelper.handleBackendErrors(err, this.form);
        this.formLoading = false;
      },
    });
  }

  toggleStatus(emp: any) {
    this.hr.toggleStatus(emp.id).subscribe({
      next: () => this.list.load(),
      error: () => {},
    });
  }
}
