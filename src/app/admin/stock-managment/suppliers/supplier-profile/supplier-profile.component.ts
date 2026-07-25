import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LoadingComponent } from '../../../../loading/loading.component';
import {
  SupplierProfileService, SupplierProfile, SupplierProducts, SupplierAnalytics, SupplierGlobalInsights,
} from '../../../../services/supplier-profile.service';
import { ReportToolbarComponent } from '../../../../shared/components/common/report-toolbar/report-toolbar.component';
import { StockService } from '../../../../services/stock.service';
import { SafeService } from '../../../../services/safe.service';
import { SupplierLedger, SupplierContact } from '../../../../models/stock.model';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';

/**
 * The single professional profile screen for a supplier — general info,
 * purchase statistics, products supplied (grouped by type; Compound
 * Products never appear since they're never purchased), and trend charts.
 * Read-only aggregates over Supply/SupplyItem — never writes.
 */
@Component({
  selector: 'app-supplier-profile',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LoadingComponent, NgApexchartsModule, ReportToolbarComponent, AlertComponent, ButtonComponent],
  templateUrl: './supplier-profile.component.html',
})
export class SupplierProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(SupplierProfileService);
  private stockService = inject(StockService);
  private safeService = inject(SafeService);
  private fb = inject(FormBuilder);

  supplierId!: number;
  loading = false;
  profile: SupplierProfile | null = null;
  products: SupplierProducts | null = null;
  analytics: SupplierAnalytics | null = null;
  insights: SupplierGlobalInsights | null = null;

  activeTab: 'overview' | 'ledger' | 'contacts' = 'overview';

  // ── Ledger ──────────────────────────────────────────────
  ledger: SupplierLedger | null = null;
  ledgerLoading = false;
  paymentStatusLabels: Record<string, string> = { paid: 'مدفوعة', partial: 'مدفوعة جزئياً', credit: 'آجل' };
  paymentStatusClasses: Record<string, string> = {
    paid: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    partial: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    credit: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  };

  showPayForm = false;
  payingInvoiceId: number | null = null;
  payingInvoiceRemaining = 0;
  safes: { id: number; name: string }[] = [];
  currencies: { id: number; code: string }[] = [];
  payForm: FormGroup = this.fb.group({
    safe_id: [null, Validators.required],
    currency_id: [null, Validators.required],
    amount: [null, [Validators.required, Validators.min(0.01)]],
    note: [''],
  });
  payLoading = false;
  payAlert: { show: boolean; type: string; message: string } = { show: false, type: '', message: '' };

  // ── Contacts ────────────────────────────────────────────
  contacts: SupplierContact[] = [];
  contactsLoading = false;
  showContactForm = false;
  editingContactId: number | null = null;
  contactForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    address: ['', Validators.required],
    position: [''],
  });
  contactAlert: { show: boolean; type: string; message: string } = { show: false, type: '', message: '' };

  /** Is this supplier the #1 pick in any of the global rankings? */
  isBestFor(type: string): boolean {
    return this.insights?.best_supplier_by_type?.[type]?.id === this.supplierId;
  }
  get isMostFrequent(): boolean { return this.insights?.most_frequently_used?.id === this.supplierId; }
  get isLowestPrice(): boolean { return this.insights?.lowest_average_price?.id === this.supplierId; }
  get isHighestVolume(): boolean { return this.insights?.highest_purchase_volume?.id === this.supplierId; }
  get isMostStable(): boolean { return this.insights?.most_stable_pricing?.id === this.supplierId; }

  trendSeries: any[] = [];
  trendOptions: any = {
    chart: { type: 'bar', height: 240, fontFamily: 'inherit', toolbar: { show: false } },
    colors: ['#465fff'],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: { categories: [], labels: { style: { fontSize: '10px', colors: '#6b7280' } } },
    yaxis: { labels: { style: { fontSize: '10px', colors: '#6b7280' } } },
    grid: { strokeDashArray: 4, borderColor: '#f3f4f6' },
  };

  get typeGroups(): { key: 'RAW_MATERIAL' | 'PACKAGING' | 'READY_PRODUCT'; label: string; icon: string }[] {
    return [
      { key: 'RAW_MATERIAL', label: 'خامات', icon: '🛢️' },
      { key: 'PACKAGING', label: 'مستلزمات تعبئة', icon: '🧴' },
      { key: 'READY_PRODUCT', label: 'منتجات جاهزة', icon: '📦' },
    ];
  }

  ngOnInit(): void {
    this.supplierId = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.svc.profile(this.supplierId).subscribe({
      next: (p) => { this.profile = p; this.loading = false; },
      error: () => { this.loading = false; },
    });
    this.svc.products(this.supplierId).subscribe({ next: (p) => { this.products = p; }, error: () => {} });
    this.svc.analytics(this.supplierId).subscribe({
      next: (a) => {
        this.analytics = a;
        this.trendSeries = [{ name: 'قيمة المشتريات', data: a.monthly_purchase_value.map((m) => m.value) }];
        this.trendOptions = { ...this.trendOptions, xaxis: { ...this.trendOptions.xaxis, categories: a.monthly_purchase_value.map((m) => m.month) } };
      },
      error: () => {},
    });
    this.svc.globalInsights().subscribe({ next: (i) => { this.insights = i; }, error: () => {} });
  }

  setTab(tab: 'overview' | 'ledger' | 'contacts') {
    this.activeTab = tab;
    if (tab === 'ledger' && !this.ledger) this.loadLedger();
    if (tab === 'contacts' && !this.contacts.length) this.loadContacts();
  }

  // ── Ledger ──────────────────────────────────────────────
  loadLedger() {
    this.ledgerLoading = true;
    this.stockService.getSupplierLedger(this.supplierId).subscribe({
      next: (l) => { this.ledger = l; this.ledgerLoading = false; },
      error: () => { this.ledgerLoading = false; },
    });
  }

  openPayForm(invoiceId: number, remaining: number) {
    this.payingInvoiceId = invoiceId;
    this.payingInvoiceRemaining = remaining;
    this.payForm.reset({ safe_id: null, currency_id: null, amount: null, note: '' });
    this.payAlert = { show: false, type: '', message: '' };
    this.showPayForm = true;
    if (!this.safes.length) {
      this.safeService.getSafes().subscribe({
        next: (res) => {
          this.safes = (res.data || []).map((s: any) => ({ id: s.id, name: s.shop?.name || 'الخزنة الرئيسية' }));
        },
        error: () => {},
      });
    }
    if (!this.currencies.length) {
      this.safeService.getCurrencies({ active_only: true }).subscribe({
        next: (res) => {
          this.currencies = res.data || [];
          const egp = this.currencies.find((c) => c.code === 'EGP');
          if (egp) this.payForm.patchValue({ currency_id: egp.id });
        },
        error: () => {},
      });
    }
  }

  closePayForm() {
    this.showPayForm = false;
    this.payingInvoiceId = null;
  }

  submitPayment() {
    if (this.payForm.invalid || !this.payingInvoiceId) {
      this.payForm.markAllAsTouched();
      return;
    }
    this.payLoading = true;
    this.stockService.paySupplier({
      supply_id: this.payingInvoiceId,
      safe_id: this.payForm.value.safe_id,
      currency_id: this.payForm.value.currency_id,
      amount: this.payForm.value.amount,
      note: this.payForm.value.note || undefined,
    }).subscribe({
      next: () => {
        this.payLoading = false;
        this.showPayForm = false;
        this.payingInvoiceId = null;
        this.loadLedger();
      },
      error: (err) => {
        this.payLoading = false;
        this.payAlert = { show: true, type: 'error', message: err?.error?.message || 'حدث خطأ أثناء تسجيل الدفعة.' };
      },
    });
  }

  // ── Contacts ────────────────────────────────────────────
  loadContacts() {
    this.contactsLoading = true;
    this.stockService.getSupplierContacts(this.supplierId).subscribe({
      next: (c) => { this.contacts = c; this.contactsLoading = false; },
      error: () => { this.contactsLoading = false; },
    });
  }

  openAddContact() {
    this.editingContactId = null;
    this.contactForm.reset({ name: '', phone: '', address: '', position: '' });
    this.contactAlert = { show: false, type: '', message: '' };
    this.showContactForm = true;
  }

  openEditContact(c: SupplierContact) {
    this.editingContactId = c.id;
    this.contactForm.reset({ name: c.name, phone: c.phone, address: c.address, position: c.position || '' });
    this.contactAlert = { show: false, type: '', message: '' };
    this.showContactForm = true;
  }

  closeContactForm() {
    this.showContactForm = false;
    this.editingContactId = null;
  }

  submitContact() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    const data = this.contactForm.value;
    const request = this.editingContactId
      ? this.stockService.updateSupplierContact(this.supplierId, this.editingContactId, data)
      : this.stockService.addSupplierContact(this.supplierId, data);
    request.subscribe({
      next: () => {
        this.showContactForm = false;
        this.editingContactId = null;
        this.loadContacts();
      },
      error: (err) => {
        this.contactAlert = { show: true, type: 'error', message: err?.error?.message || 'حدث خطأ أثناء الحفظ.' };
      },
    });
  }

  deleteContact(c: SupplierContact) {
    if (!confirm(`هل تريد حذف جهة الاتصال "${c.name}"؟`)) return;
    this.stockService.deleteSupplierContact(this.supplierId, c.id).subscribe({
      next: () => this.loadContacts(),
      error: () => {},
    });
  }
}
