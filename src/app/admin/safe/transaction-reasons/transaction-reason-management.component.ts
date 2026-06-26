import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SafeService } from '../../../services/safe.service';
import { TransactionReason } from '../../../models/safe.model';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-transaction-reason-management',
  imports: [CommonModule, ReactiveFormsModule, LoadingComponent, ModalComponent, AlertComponent],
  templateUrl: './transaction-reason-management.component.html',
})
export class TransactionReasonManagementComponent implements OnInit {
  private safeService = inject(SafeService);
  private fb = inject(FormBuilder);

  reasons: TransactionReason[] = [];
  loading = false;

  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  editTarget: TransactionReason | null = null;
  modalLoading = false;
  modalError = '';

  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  form: FormGroup = this.fb.group({
    name:      ['', Validators.required],
    direction: ['both', Validators.required],
    is_active: [true],
  });

  ngOnInit(): void { this.load(); }

  load() {
    this.loading = true;
    this.safeService.getReasons().subscribe({
      next: (res) => { this.reasons = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openCreate() {
    this.modalMode = 'create';
    this.editTarget = null;
    this.modalError = '';
    this.form.reset({ name: '', direction: 'both', is_active: true });
    this.showModal = true;
  }

  openEdit(r: TransactionReason) {
    this.modalMode = 'edit';
    this.editTarget = r;
    this.modalError = '';
    this.form.patchValue({ name: r.name, direction: r.direction, is_active: r.is_active });
    this.showModal = true;
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.modalLoading = true;
    this.modalError = '';

    const v = this.form.getRawValue();
    const req$ = this.modalMode === 'create'
      ? this.safeService.createReason(v)
      : this.safeService.updateReason(this.editTarget!.id, v);

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

  directionLabel(d: string): string {
    return d === 'in' ? 'إيداع' : d === 'out' ? 'سحب' : 'كلاهما';
  }

  directionClass(d: string): string {
    if (d === 'in')  return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400';
    if (d === 'out') return 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400';
    return 'bg-gray-100 text-gray-600 dark:bg-white/[0.05] dark:text-gray-400';
  }

  f(name: string) { return this.form.get(name); }
  isInvalid(name: string) { return this.f(name)?.invalid && this.f(name)?.touched; }
}
