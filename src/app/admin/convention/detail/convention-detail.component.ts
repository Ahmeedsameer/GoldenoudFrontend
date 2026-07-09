import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConventionService } from '../../../services/convention.service';
import { ShopService } from '../../../services/shop.service';
import { Convention, ConventionTransaction } from '../../../models/convention.model';
import { ListManager } from '../../../services/list-manager';
import { LoadingComponent } from '../../../loading/loading.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { PaginationComponent } from '../../../pagination/pagination.component';

@Component({
  selector: 'app-convention-detail',
  imports: [CommonModule, ReactiveFormsModule, LoadingComponent, ModalComponent, AlertComponent, PaginationComponent],
  templateUrl: './convention-detail.component.html',
})
export class ConventionDetailComponent implements OnInit, OnDestroy {
  private conventionService = inject(ConventionService);
  private shopService = inject(ShopService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  conventionId!: number;
  convention: Convention | null = null;
  conventionLoading = false;

  list = new ListManager<ConventionTransaction>(
    (params) => this.conventionService.getTransactions(this.conventionId, params).pipe(map((r) => r.data))
  );

  alert: { show: boolean; type: 'success' | 'error'; message: string } =
    { show: false, type: 'success', message: '' };

  // sorting
  sortBy: 'date' | 'amount' = 'date';
  sortDir: 'asc' | 'desc' = 'desc';

  // ── Transaction modal ───────────────────────────────────
  showTxModal = false;
  editingTxId: number | null = null;
  txLoading = false;
  txError = '';

  txForm: FormGroup = this.fb.group({
    manager_id: [null, Validators.required],
    amount:     [null, [Validators.required, Validators.min(0.01)]],
    reason:     ['', Validators.required],
    notes:      [''],
    date:       ['', Validators.required],
  });

  // Manager typeahead
  managerSearch = '';
  managerResults: any[] = [];
  managerSearchLoading = false;
  showManagerDropdown = false;
  private managerSearch$ = new Subject<string>();

  // ── Delete modal ────────────────────────────────────────
  showDeleteModal = false;
  txToDelete: number | null = null;
  deleteLoading = false;

  ngOnInit(): void {
    this.conventionId = +this.route.snapshot.params['id'];
    this.loadConvention();
    this.list.filters = { sort_by: this.sortBy, sort_dir: this.sortDir };
    this.list.load();

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
        error: () => { this.managerSearchLoading = false; },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConvention() {
    this.conventionLoading = true;
    this.conventionService.getById(this.conventionId).subscribe({
      next: (res) => { this.convention = res.data; this.conventionLoading = false; },
      error: () => { this.conventionLoading = false; },
    });
  }

  // ── Helpers ─────────────────────────────────────────────
  get amount(): number { return +(this.convention?.amount ?? 0); }
  get spent(): number { return +(this.convention?.transactions_sum_amount ?? 0); }
  get remaining(): number { return this.amount - this.spent; }
  get remainingPercent(): number {
    if (this.amount <= 0) return 0;
    return Math.max(0, Math.min(100, (this.remaining / this.amount) * 100));
  }

  // ── Filters / sorting ───────────────────────────────────
  setSearch(value: string)   { this.list.setFilter('search', value || undefined); }
  setDateFrom(value: string) { this.list.setFilter('date_from', value || undefined); }
  setDateTo(value: string)   { this.list.setFilter('date_to', value || undefined); }

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

  // ── Manager typeahead ───────────────────────────────────
  onManagerSearchChange(q: string) {
    this.managerSearch = q;
    this.showManagerDropdown = true;
    if (!q) {
      this.txForm.get('manager_id')?.setValue(null);
    }
    this.managerSearch$.next(q);
  }

  selectManager(manager: any) {
    this.managerSearch = manager.name;
    this.txForm.get('manager_id')?.setValue(manager.id);
    this.showManagerDropdown = false;
    this.managerResults = [];
  }

  // ── Add / Edit transaction ──────────────────────────────
  openCreateTx() {
    this.editingTxId = null;
    this.txError = '';
    this.managerSearch = '';
    this.managerResults = [];
    this.txForm.reset({ manager_id: null, amount: null, reason: '', notes: '', date: new Date().toISOString().slice(0, 10) });
    this.showTxModal = true;
  }

  openEditTx(tx: ConventionTransaction) {
    this.editingTxId = tx.id;
    this.txError = '';
    this.managerSearch = tx.manager?.name || '';
    this.managerResults = [];
    this.txForm.reset({
      manager_id: tx.manager_id,
      amount: +tx.amount,
      reason: tx.reason || '',
      notes: tx.notes || '',
      date: (tx.date || '').slice(0, 10),
    });
    this.showTxModal = true;
  }

  submitTx() {
    if (this.txForm.invalid) { this.txForm.markAllAsTouched(); return; }
    this.txLoading = true;
    this.txError = '';

    const v = this.txForm.value;
    const body = {
      manager_id: +v.manager_id,
      amount: +v.amount,
      reason: v.reason,
      notes: v.notes || undefined,
      date: v.date,
    };
    const req$ = this.editingTxId
      ? this.conventionService.updateTransaction(this.editingTxId, body)
      : this.conventionService.createTransaction(this.conventionId, body);

    req$.subscribe({
      next: (res) => {
        this.txLoading = false;
        this.showTxModal = false;
        this.alert = { show: true, type: 'success', message: res.message };
        this.loadConvention();
        this.list.load();
      },
      error: (err) => {
        this.txLoading = false;
        this.txError = err?.error?.message || 'حدث خطأ غير متوقع.';
      },
    });
  }

  // ── Delete transaction ──────────────────────────────────
  confirmDelete(id: number) {
    this.txToDelete = id;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.txToDelete = null;
  }

  deleteTx() {
    if (!this.txToDelete) return;
    this.deleteLoading = true;
    this.conventionService.deleteTransaction(this.txToDelete).subscribe({
      next: (res) => {
        this.deleteLoading = false;
        this.showDeleteModal = false;
        this.txToDelete = null;
        this.alert = { show: true, type: 'success', message: res.message };
        this.loadConvention();
        this.list.load();
      },
      error: (err) => {
        this.deleteLoading = false;
        this.showDeleteModal = false;
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'حدث خطأ غير متوقع.' };
      },
    });
  }

  txf(name: string) { return this.txForm.get(name); }
  txfInvalid(name: string) { return this.txf(name)?.invalid && this.txf(name)?.touched; }
}
