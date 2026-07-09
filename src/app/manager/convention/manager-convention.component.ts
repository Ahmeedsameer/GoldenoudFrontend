import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs/operators';
import { ConventionService } from '../../services/convention.service';
import { Convention, ConventionTransaction } from '../../models/convention.model';
import { ListManager } from '../../services/list-manager';
import { LoadingComponent } from '../../loading/loading.component';
import { ModalComponent } from '../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../shared/components/ui/alert/alert.component';
import { PaginationComponent } from '../../pagination/pagination.component';

@Component({
  selector: 'app-manager-convention',
  imports: [CommonModule, ReactiveFormsModule, LoadingComponent, ModalComponent, AlertComponent, PaginationComponent],
  templateUrl: './manager-convention.component.html',
})
export class ManagerConventionComponent implements OnInit {
  private conventionService = inject(ConventionService);
  private fb = inject(FormBuilder);

  conventions: Convention[] = [];
  selected: Convention | null = null;
  loading = false;

  list = new ListManager<ConventionTransaction>(
    (params) => this.conventionService.getManagerTransactions(this.selected!.id, params).pipe(map((r) => r.data))
  );

  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  // sorting
  sortBy: 'date' | 'amount' = 'date';
  sortDir: 'asc' | 'desc' = 'desc';

  // ── Withdraw modal ──────────────────────────────────────
  showWithdrawModal = false;
  withdrawLoading = false;
  withdrawError = '';

  withdrawForm: FormGroup = this.fb.group({
    amount: [null, [Validators.required, Validators.min(0.01)]],
    reason: ['', [Validators.required]],
    notes:  [''],
  });

  ngOnInit(): void {
    this.loadConventions();
  }

  loadConventions() {
    this.loading = true;
    this.conventionService.getManagerConventions().subscribe({
      next: (res) => {
        this.conventions = res.data || [];
        if (this.conventions.length && !this.selected) {
          this.select(this.conventions[0]);
        } else if (this.selected) {
          this.selected = this.conventions.find((c) => c.id === this.selected!.id) || this.conventions[0] || null;
        }
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  select(c: Convention) {
    this.selected = c;
    this.list.filters = { sort_by: this.sortBy, sort_dir: this.sortDir };
    this.list.result.currentPage = 1;
    this.list.load();
  }

  // ── Helpers ─────────────────────────────────────────────
  amount(c: Convention | null): number { return +(c?.amount ?? 0); }
  spent(c: Convention | null): number { return +(c?.transactions_sum_amount ?? 0); }
  remaining(c: Convention | null): number { return this.amount(c) - this.spent(c); }
  remainingPercent(c: Convention | null): number {
    const a = this.amount(c);
    if (a <= 0) return 0;
    return Math.max(0, Math.min(100, (this.remaining(c) / a) * 100));
  }

  // ── Filters / sorting ───────────────────────────────────
  setSearch(value: string) { this.list.setFilter('search', value || undefined); }

  setSort(col: 'date' | 'amount') {
    if (this.sortBy === col) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = col;
      this.sortDir = 'desc';
    }
    this.list.filters['sort_by'] = this.sortBy;
    this.list.setFilter('sort_dir', this.sortDir);
  }

  // ── Withdraw ────────────────────────────────────────────
  openWithdraw() {
    this.withdrawError = '';
    this.withdrawForm.reset({ amount: null, reason: '', notes: '' });
    this.showWithdrawModal = true;
  }

  submitWithdraw() {
    if (!this.selected) return;
    if (this.withdrawForm.invalid) { this.withdrawForm.markAllAsTouched(); return; }

    const amount = +this.withdrawForm.value.amount;
    if (amount > this.remaining(this.selected)) {
      this.withdrawError = `المبلغ يتجاوز الرصيد المتبقي (${this.remaining(this.selected).toFixed(2)})`;
      return;
    }

    this.withdrawLoading = true;
    this.withdrawError = '';

    const body = {
      amount,
      reason: this.withdrawForm.value.reason,
      notes: this.withdrawForm.value.notes || undefined,
    };

    this.conventionService.managerWithdraw(this.selected.id, body).subscribe({
      next: (res) => {
        this.withdrawLoading = false;
        this.showWithdrawModal = false;
        this.alert = { show: true, type: 'success', message: res.message };
        this.loadConventions();
        this.list.load();
      },
      error: (err) => {
        this.withdrawLoading = false;
        this.withdrawError = err?.error?.message || 'حدث خطأ غير متوقع.';
      },
    });
  }

  wf(name: string) { return this.withdrawForm.get(name); }
  wfInvalid(name: string) { return this.wf(name)?.invalid && this.wf(name)?.touched; }
}
