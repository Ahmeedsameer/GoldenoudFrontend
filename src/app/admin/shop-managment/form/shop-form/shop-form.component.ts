import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { InputFieldComponent } from '../../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../../shared/components/form/label/label.component';
import { Option, SelectComponent } from '../../../../shared/components/form/select/select.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { FormErrorComponent } from '../../../../form-error/form-error.component';
import { AlertState, FormHelperService } from '../../../../services/form-helper.service';
import { ShopService } from '../../../../services/shop.service';

@Component({
  selector: 'app-shop-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ComponentCardComponent,
    InputFieldComponent,
    LabelComponent,
    SelectComponent,
    ButtonComponent,
    LoadingComponent,
    AlertComponent,
    FormErrorComponent,
  ],
  templateUrl: './shop-form.component.html',
  styleUrl: './shop-form.component.css',
})
export class ShopFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private shopService = inject(ShopService);
  private formHelperService = inject(FormHelperService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  shopId: number | null = null;
  isEdit = false;
  loading = false;
  pageLoading = false;
  alert: AlertState = { show: false, type: '', message: '' };
  originalUsername = '';

  // Username live check
  usernameChecking = false;
  usernameAvailable: boolean | null = null;
  private usernameCheck$ = new Subject<string>();

  // Manager typeahead
  managerSearch = '';
  managerResults: any[] = [];
  managerSearchLoading = false;
  showManagerDropdown = false;
  selectedManager: any = null;
  private managerSearch$ = new Subject<string>();

  statusOptions: Option[] = [
    { value: 'active', label: 'نشط' },
    { value: 'inactive', label: 'غير نشط' },
  ];

  shopForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    status: ['active'],
    manager_id: [null],
  });

  ngOnInit(): void {
    this.shopId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = !!this.shopId;

    if (this.isEdit) {
      this.shopForm.get('password')?.clearValidators();
      this.shopForm.get('password')?.updateValueAndValidity();
      this.loadShop();
    }

    // Username debounce check
    this.usernameCheck$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
        switchMap((val) => {
          if (!val || val.length < 3) {
            this.usernameAvailable = null;
            return of(null);
          }
          // On edit: skip check if username unchanged
          if (this.isEdit && val === this.originalUsername) {
            this.usernameAvailable = true;
            return of(null);
          }
          this.usernameChecking = true;
          return this.shopService.checkUsername(val);
        })
      )
      .subscribe({
        next: (res) => {
          this.usernameChecking = false;
          if (res === null) return;
          this.usernameAvailable = !res.exists;
          if (res.exists) {
            this.shopForm.get('username')?.setErrors({ usernameTaken: true });
          } else {
            const ctrl = this.shopForm.get('username');
            if (ctrl?.hasError('usernameTaken')) {
              ctrl.setErrors(null);
            }
          }
        },
        error: () => {
          this.usernameChecking = false;
        },
      });

    // Manager search debounce
    this.managerSearch$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
        switchMap((q) => {
          if (!q || q.length < 2) {
            this.managerResults = [];
            return of({ data: [] });
          }
          this.managerSearchLoading = true;
          return this.shopService.searchUsers(q, 'manager');
        })
      )
      .subscribe({
        next: (res) => {
          this.managerSearchLoading = false;
          this.managerResults = res.data || [];
        },
        error: () => {
          this.managerSearchLoading = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadShop() {
    this.pageLoading = true;
    this.shopService.getShopById(this.shopId!).subscribe({
      next: (res) => {
        const shop = res.data || res;
        this.originalUsername = shop.username;
        this.shopForm.patchValue({
          name: shop.name,
          address: shop.address,
          username: shop.username,
          status: shop.status,
          manager_id: shop.manager?.id || null,
        });
        if (shop.manager) {
          this.selectedManager = shop.manager;
          this.managerSearch = shop.manager.name;
        }
        this.pageLoading = false;
      },
      error: () => {
        this.pageLoading = false;
      },
    });
  }

  onUsernameChange(val:any) {
    this.shopForm.get('username')?.setValue(val);
    this.usernameAvailable = null;
    this.usernameCheck$.next(val);
  }

  onManagerSearchChange(q: string) {
    this.managerSearch = q;
    this.showManagerDropdown = true;
    if (!q) {
      this.selectedManager = null;
      this.shopForm.get('manager_id')?.setValue(null);
    }
    this.managerSearch$.next(q);
  }

  selectManager(manager: any) {
    this.selectedManager = manager;
    this.managerSearch = manager.name;
    this.shopForm.get('manager_id')?.setValue(manager.id);
    this.showManagerDropdown = false;
    this.managerResults = [];
  }

  clearManager() {
    this.selectedManager = null;
    this.managerSearch = '';
    this.shopForm.get('manager_id')?.setValue(null);
  }

  onSubmit() {
    if (this.shopForm.invalid || this.usernameAvailable === false) {
      this.shopForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    const formValue: any = { ...this.shopForm.value };

    // On edit: omit password if empty
    if (this.isEdit && !formValue.password) {
      delete formValue.password;
    }
    // Omit null manager_id
    if (!formValue.manager_id) {
      delete formValue.manager_id;
    }

    const request = this.isEdit
      ? this.shopService.updateShop(this.shopId!, formValue)
      : this.shopService.createShop(formValue);

    request.subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard/shops']);
      },
      error: (err) => {
        this.alert = this.formHelperService.handleBackendErrors(err, this.shopForm);
        this.loading = false;
      },
    });
  }
}
