import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SafeService } from '../../../services/safe.service';
import { SafeType } from '../../../models/safe.model';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-safe-type-management',
  imports: [CommonModule, ReactiveFormsModule, LoadingComponent, ModalComponent, AlertComponent],
  templateUrl: './safe-type-management.component.html',
})
export class SafeTypeManagementComponent implements OnInit {
  private safeService = inject(SafeService);
  private fb = inject(FormBuilder);

  safeTypes: SafeType[] = [];
  loading = false;

  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  editTarget: SafeType | null = null;
  modalLoading = false;
  modalError = '';

  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  form: FormGroup = this.fb.group({
    name:      ['', Validators.required],
    kind:      ['physical', Validators.required],
    is_active: [true],
  });

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.safeService.getSafeTypes().subscribe({
      next: (res) => { this.safeTypes = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openCreate() {
    this.modalMode = 'create';
    this.editTarget = null;
    this.modalError = '';
    this.form.reset({ name: '', kind: 'physical', is_active: true });
    this.form.get('kind')?.enable();
    this.showModal = true;
  }

  openEdit(st: SafeType) {
    this.modalMode = 'edit';
    this.editTarget = st;
    this.modalError = '';
    this.form.patchValue({ name: st.name, kind: st.kind, is_active: st.is_active });
    this.form.get('kind')?.disable();
    this.showModal = true;
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.modalLoading = true;
    this.modalError = '';

    const v = this.form.getRawValue();
    const req$ = this.modalMode === 'create'
      ? this.safeService.createSafeType(v)
      : this.safeService.updateSafeType(this.editTarget!.id, { name: v.name, is_active: v.is_active });

    req$.subscribe({
      next: (res) => {
        this.modalLoading = false;
        this.showModal = false;
        this.alert = { show: true, type: 'success', message: res.message };
        this.load();
      },
      error: (err) => {
        this.modalLoading = false;
        this.modalError = err?.error?.message || 'حدث خطأ غير متوقع.';
      },
    });
  }

  kindLabel(kind: string): string {
    return kind === 'physical' ? 'نقدي' : 'إلكتروني';
  }

  kindClass(kind: string): string {
    return kind === 'physical'
      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
      : 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400';
  }

  f(name: string) { return this.form.get(name); }
  isInvalid(name: string) { return this.f(name)?.invalid && this.f(name)?.touched; }
}
