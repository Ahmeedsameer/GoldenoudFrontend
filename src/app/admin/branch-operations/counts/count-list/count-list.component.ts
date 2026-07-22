import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { ReportEmptyStateComponent } from '../../../../shared/components/reports/report-empty-state/report-empty-state.component';
import { InventoryCountService, CountSession } from '../../../../services/inventory-count.service';
import { ShopService } from '../../../../services/shop.service';
import { UserManagmentService } from '../../../../services/user-managment.service';
import { AuthService } from '../../../../services/auth.service';

const STATUS_LABELS: Record<string, string> = { counting: 'جاري الجرد', review: 'قيد المراجعة', approved: 'تمت الموافقة', completed: 'مكتمل' };
const STATUS_CLASSES: Record<string, string> = {
  counting: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  review: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  approved: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  completed: 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300',
};

@Component({
  selector: 'app-count-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent, ReportEmptyStateComponent],
  templateUrl: './count-list.component.html',
})
export class CountListComponent implements OnInit {
  private svc = inject(InventoryCountService);
  private shopSvc = inject(ShopService);
  private userSvc = inject(UserManagmentService);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  errorMsg = '';
  sessions: CountSession[] = [];
  meta: { current_page: number; last_page: number; total: number } | null = null;
  page = 1;

  shops: { id: number; name: string }[] = [];
  employees: { id: number; name: string }[] = [];

  statusFilter = '';
  shopFilter: number | null = null;

  showForm = false;
  saving = false;
  formError = '';
  form = { shop_id: null as number | null, employee_ids: [] as number[], notes: '' };

  get isManager(): boolean { return this.auth.getUserRole() === 'manager'; }

  ngOnInit(): void {
    const userShopId = this.auth.getUser()?.shop_id ?? null;
    this.shopSvc.getShops({ per_page: 200 }).subscribe({
      next: (res) => {
        this.shops = (res.data || []).map((s: any) => ({ id: s.id, name: s.name }));
        if (this.isManager && userShopId) { this.shopFilter = userShopId; this.form.shop_id = userShopId; }
        this.load();
      },
    });
    this.userSvc.getUsers({ per_page: 200 }).subscribe({
      next: (res) => { this.employees = (res.data || []).map((u: any) => ({ id: u.id, name: u.name })); },
      error: () => {},
    });
  }

  load(): void {
    this.loading = true;
    this.svc.list({ status: this.statusFilter || undefined, shop_id: this.shopFilter ?? undefined, page: this.page, per_page: 25 }).subscribe({
      next: (page) => {
        this.sessions = page.data;
        this.meta = { current_page: page.current_page, last_page: page.last_page, total: page.total };
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  applyFilters(): void { this.page = 1; this.load(); }
  nextPage(): void { if (this.meta && this.page < this.meta.last_page) { this.page++; this.load(); } }
  prevPage(): void { if (this.page > 1) { this.page--; this.load(); } }

  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }
  statusClass(s: string): string { return STATUS_CLASSES[s] ?? 'bg-gray-100 text-gray-600'; }

  toggleForm(): void { this.showForm = !this.showForm; this.formError = ''; }

  toggleEmployee(id: number): void {
    const idx = this.form.employee_ids.indexOf(id);
    if (idx >= 0) this.form.employee_ids.splice(idx, 1); else this.form.employee_ids.push(id);
  }

  submitForm(): void {
    this.formError = '';
    if (!this.form.shop_id) { this.formError = 'يجب اختيار الفرع'; return; }
    this.saving = true;
    this.svc.create({ shop_id: this.form.shop_id, employee_ids: this.form.employee_ids, notes: this.form.notes || undefined }).subscribe({
      next: (session) => { this.saving = false; this.router.navigate(['/dashboard/branch-operations/counts', session.id]); },
      error: (err) => { this.saving = false; this.formError = err?.error?.message || 'حدث خطأ أثناء إنشاء جلسة الجرد'; },
    });
  }
}
