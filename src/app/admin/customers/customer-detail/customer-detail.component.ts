import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomerService } from '../../../services/customer.service';
import { AuthService } from '../../../services/auth.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { CustomerFormComponent, CustomerFormModel } from '../../../shared/components/customer-form/customer-form.component';

/**
 * Customer Details — Phase 4: a real cross-entity Activity Timeline (built
 * from sales_audit_logs, replacing the old invoice-only timeline), extended
 * stats, rule-based + manual Tags, a Similar-Customers recommendation,
 * PDF/Excel export, and an append-only Notes History (replacing the old
 * single mutable notes field). Every figure still comes straight from
 * CustomerController::show() — nothing is recalculated client-side.
 */
@Component({
  selector: 'app-customer-detail',
  imports: [
    CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent,
    ModalComponent, CustomerFormComponent, BadgeComponent, ReportToolbarComponent,
  ],
  templateUrl: './customer-detail.component.html',
})
export class CustomerDetailComponent implements OnInit {
  private customerService = inject(CustomerService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = false;
  customer: any = null;
  stats: any = null;
  analytics: any = null;
  invoices: any[] = [];
  activity: any[] = [];
  mostPurchasedProducts: any[] = [];
  autoTags: any[] = [];
  manualTags: any[] = [];
  alert: { show: boolean; type: 'success' | 'error' | ''; message: string } = { show: false, type: '', message: '' };

  get isAdmin(): boolean { return this.authService.isAdmin(); }
  get isManager(): boolean { return this.authService.isManager(); }
  get isSeller(): boolean { return this.authService.isSeller(); }
  /** Only Manager/Seller actually have a Cashier page to sell from. */
  get canCreateInvoice(): boolean { return this.authService.isManager() || this.authService.isSeller(); }
  get canManageTags(): boolean { return this.isAdmin || this.isManager; }
  get canExport(): boolean { return this.isAdmin || this.isManager; }
  get canAddNote(): boolean { return this.isAdmin || this.isManager || this.isSeller; }
  get canDeleteNote(): boolean { return this.isAdmin; }

  // ── Edit Customer — reuses the same <app-customer-form> the cashier's
  //    quick-add uses; loads current data, saves via the existing
  //    PUT /customers/{id} endpoint. Admin only (isAdmin gates the button
  //    in the template; the backend route is admin-only too).
  showEditCustomer = false;
  editCustomerModel: CustomerFormModel = { name: '', phone: '', email: '', address: '' };
  editCustomerLoading = false;
  editCustomerError = '';

  // ── Notes History (Task 6) ────────────────────────────
  noteHistory: any[] = [];
  noteHistoryLoading = false;
  newNoteDraft = '';
  addingNote = false;

  // ── Tags (Task 3) ──────────────────────────────────────
  showTagPicker = false;
  allTags: any[] = [];
  tagPickerLoading = false;
  tagPickerError = '';
  newTagName = '';
  newTagColor = 'primary';

  // ── Similar Customers (Task 4) ─────────────────────────
  similarCustomers: any[] = [];
  similarCustomersLoading = false;

  private currentUserId: number | null = null;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.currentUserId = this.authService.getUser()?.id ?? null;
    this.load(id);
  }

  load(id: number) {
    this.loading = true;
    this.customerService.getCustomer(id).subscribe({
      next: (res) => {
        const data = res?.data ?? res;
        this.customer = data.customer;
        this.stats = data.stats;
        this.analytics = data.analytics;
        this.invoices = data.invoices ?? [];
        this.activity = [...(data.activity ?? [])].reverse(); // newest first
        this.mostPurchasedProducts = data.most_purchased_products ?? [];
        this.autoTags = data.tags?.auto ?? [];
        this.manualTags = data.tags?.manual ?? [];
        this.loading = false;

        // Lazy, non-blocking — keeps the main profile load fast.
        this.loadSimilarCustomers(id);
        this.loadNoteHistory(id);
      },
      error: (err) => {
        this.loading = false;
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'تعذّر جلب بيانات العميل.' };
      },
    });
  }

  openInvoice(invoiceId: number) {
    this.router.navigate(['/dashboard/invoices', invoiceId]);
  }

  /** Same 3 statuses used everywhere else in the app (Invoice.status) — no new values invented. */
  statusLabel(status: string): string {
    if (status === 'approved') return 'مكتملة';
    if (status === 'cancelled') return 'ملغاة';
    return 'معلقة';
  }

  statusBadgeClass(status: string): string {
    if (status === 'approved') return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400';
    if (status === 'cancelled') return 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400';
    return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400';
  }

  // ── Activity Timeline (Task 1) ─────────────────────────
  activityLabel(entry: any): string {
    if (entry.milestone === 'first_purchase') return 'أول عملية شراء';
    if (entry.milestone === 'latest_purchase') return 'أحدث عملية شراء';
    const labels: Record<string, string> = {
      customer_created: 'تم إنشاء العميل',
      customer_updated: 'تحديث بيانات العميل',
      customer_note_added: 'ملاحظة جديدة',
      customer_tag_added: 'إضافة وسم',
      customer_tag_removed: 'إزالة وسم',
      invoice_created: 'فاتورة جديدة',
      invoice_cancelled: 'إلغاء فاتورة',
    };
    return labels[entry.type] ?? entry.type;
  }

  activityBadgeClass(entry: any): string {
    if (entry.type === 'invoice_cancelled') return 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400';
    if (entry.type === 'invoice_created') return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400';
    if (entry.type.startsWith('customer_tag')) return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400';
    return 'bg-blue-light-50 text-blue-light-700 dark:bg-blue-light-500/15 dark:text-blue-light-400';
  }

  /** Invoice-related entries carry the invoice id as subject_id — clicking opens the existing invoice detail page. */
  activityIsInvoice(entry: any): boolean {
    return entry.type === 'invoice_created' || entry.type === 'invoice_cancelled';
  }

  onActivityClick(entry: any) {
    if (this.activityIsInvoice(entry)) {
      this.openInvoice(entry.subject_id);
    }
  }

  // ── Similar Customers (Task 4) ─────────────────────────
  loadSimilarCustomers(id: number) {
    this.similarCustomersLoading = true;
    this.customerService.getSimilarCustomers(id).subscribe({
      next: (res) => {
        this.similarCustomers = res?.data ?? [];
        this.similarCustomersLoading = false;
      },
      error: () => { this.similarCustomersLoading = false; },
    });
  }

  // ── Notes History (Task 6) ─────────────────────────────
  loadNoteHistory(id: number) {
    this.noteHistoryLoading = true;
    this.customerService.getNoteHistory(id).subscribe({
      next: (res) => {
        this.noteHistory = [...(res?.data ?? [])].reverse(); // newest first
        this.noteHistoryLoading = false;
      },
      error: () => { this.noteHistoryLoading = false; },
    });
  }

  addNote() {
    const note = this.newNoteDraft.trim();
    if (!note) return;

    this.addingNote = true;
    this.customerService.addNote(this.customer.id, note).subscribe({
      next: () => {
        this.addingNote = false;
        this.newNoteDraft = '';
        this.loadNoteHistory(this.customer.id);
        this.load(this.customer.id); // refresh activity timeline too
      },
      error: (err) => {
        this.addingNote = false;
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'تعذّر إضافة الملاحظة.' };
      },
    });
  }

  /** Only the author's own single latest note may be edited. */
  canEditNote(note: any): boolean {
    if (!this.isAdmin && !this.isManager) return false;
    if (note.author_id !== this.currentUserId) return false;
    const latestOwn = this.noteHistory.find((n) => n.author_id === this.currentUserId);
    return !!latestOwn && latestOwn.id === note.id;
  }

  deleteNote(noteId: number) {
    this.customerService.deleteNote(this.customer.id, noteId).subscribe({
      next: () => this.loadNoteHistory(this.customer.id),
      error: (err) => {
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'تعذّر حذف الملاحظة.' };
      },
    });
  }

  // ── Tags (Task 3) ───────────────────────────────────────
  tagBadgeColor(tag: any): 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark' {
    const valid = ['primary', 'success', 'error', 'warning', 'info', 'light', 'dark'];
    return valid.includes(tag.color) ? tag.color : 'primary';
  }

  openTagPicker() {
    this.tagPickerError = '';
    this.newTagName = '';
    this.showTagPicker = true;
    if (this.allTags.length === 0) {
      this.customerService.getTags().subscribe({ next: (res) => { this.allTags = res?.data ?? []; } });
    }
  }

  get availableManualTags(): any[] {
    const attachedIds = new Set(this.manualTags.map((t) => t.id));
    return this.allTags.filter((t) => t.type === 'manual' && !attachedIds.has(t.id));
  }

  attachExistingTag(tagId: number) {
    this.tagPickerLoading = true;
    this.customerService.attachTag(this.customer.id, tagId).subscribe({
      next: (res) => {
        this.tagPickerLoading = false;
        this.manualTags = res?.data ?? this.manualTags;
      },
      error: (err) => {
        this.tagPickerLoading = false;
        this.tagPickerError = err?.error?.message || 'تعذّر إضافة الوسم.';
      },
    });
  }

  detachTag(tagId: number) {
    this.customerService.detachTag(this.customer.id, tagId).subscribe({
      next: (res) => { this.manualTags = res?.data ?? this.manualTags.filter((t) => t.id !== tagId); },
      error: (err) => {
        this.alert = { show: true, type: 'error', message: err?.error?.message || 'تعذّر إزالة الوسم.' };
      },
    });
  }

  createAndAttachTag() {
    const name = this.newTagName.trim();
    if (!name) return;

    this.tagPickerLoading = true;
    this.tagPickerError = '';
    this.customerService.createTag({ name, color: this.newTagColor }).subscribe({
      next: (res) => {
        const tag = res?.data;
        this.allTags = [...this.allTags, tag];
        this.newTagName = '';
        if (tag) this.attachExistingTag(tag.id);
        else this.tagPickerLoading = false;
      },
      error: (err) => {
        this.tagPickerLoading = false;
        this.tagPickerError = err?.error?.message || 'تعذّر إنشاء الوسم.';
      },
    });
  }

  // ── Edit Customer (Admin only) ────────────────────────────
  openEditCustomer() {
    this.editCustomerModel = {
      name: this.customer.name ?? '',
      phone: this.customer.phone ?? '',
      email: this.customer.email ?? '',
      address: this.customer.address ?? '',
    };
    this.editCustomerError = '';
    this.showEditCustomer = true;
  }

  saveEditCustomer() {
    this.editCustomerLoading = true;
    this.editCustomerError = '';
    this.customerService.updateCustomer(this.customer.id, {
      name: this.editCustomerModel.name.trim(),
      phone: this.editCustomerModel.phone.trim(),
      email: this.editCustomerModel.email.trim() || null,
      address: this.editCustomerModel.address.trim() || null,
    }).subscribe({
      next: (res) => {
        this.editCustomerLoading = false;
        this.showEditCustomer = false;
        this.customer = { ...this.customer, ...(res?.data ?? res) };
        this.load(this.customer.id); // refresh activity timeline too
      },
      error: (err) => {
        this.editCustomerLoading = false;
        const firstFieldError = (Object.values(err?.error?.errors ?? {}) as string[][])[0]?.[0];
        this.editCustomerError = err?.error?.message || firstFieldError || 'تعذّر تحديث بيانات العميل.';
      },
    });
  }

  /** Opens the Cashier with this customer preselected — see cashier.component.ts's
   *  ngOnInit() reading the same `customer_id` query param and reusing selectCustomer(). */
  createInvoiceForCustomer() {
    this.router.navigate(['/dashboard/cashier'], { queryParams: { customer_id: this.customer.id } });
  }
}
