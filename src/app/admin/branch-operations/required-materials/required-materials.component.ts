import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { TransferRequestService, RequiredMaterialsData, RequiredMaterialRow } from '../../../services/transfer-request.service';
import { AuthService } from '../../../services/auth.service';
import { StockService } from '../../../services/stock.service';

type StatusFilter = 'all' | 'out_of_stock' | 'low_stock' | 'needs_pricing';

const GROUP_LABELS: Record<'out_of_stock' | 'low_stock' | 'needs_pricing', string> = {
  out_of_stock: 'نفد المخزون',
  low_stock: 'مخزون منخفض',
  needs_pricing: 'يحتاج تسعير',
};

/**
 * Branch Required Materials — an intelligent read-only assistant over the
 * EXISTING Branch Inventory / Pricing / Transfer Request data (see
 * RequiredMaterialsService on the backend). Never replaces those pages, and
 * "Request from Warehouse" deep-links into the existing Stock Request create
 * screen instead of adding another request form.
 *
 * Shared between two routes:
 *  - Manager: own branch only, no shop picker (dashboard/branch-operations/required-materials).
 *  - Admin: any branch, shop picker + PDF/Excel export (dashboard/reports/required-materials).
 */
@Component({
  selector: 'app-required-materials',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, ReportToolbarComponent],
  templateUrl: './required-materials.component.html',
})
export class RequiredMaterialsComponent implements OnInit {
  private svc = inject(TransferRequestService);
  private stockSvc = inject(StockService);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  errorMsg = '';
  data: RequiredMaterialsData | null = null;

  isAdminView = false;
  shops: { id: number; name: string }[] = [];
  selectedShopId: number | null = null;

  filter: StatusFilter = 'all';
  groupLabels = GROUP_LABELS;

  ngOnInit(): void {
    this.isAdminView = this.auth.isAdmin();

    if (this.isAdminView) {
      this.stockSvc.getActiveShops().subscribe({
        next: (shops: any[]) => {
          this.shops = shops;
          if (shops.length && this.selectedShopId === null) {
            this.selectedShopId = shops[0].id;
            this.load();
          }
        },
      });
    } else {
      this.load();
    }
  }

  onShopChange(): void {
    if (this.selectedShopId) this.load();
  }

  get exportParams(): Record<string, any> {
    return this.selectedShopId ? { shop_id: this.selectedShopId } : {};
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';
    const req$ = this.isAdminView
      ? this.svc.getRequiredMaterialsReport(this.selectedShopId!)
      : this.svc.getRequiredMaterials();

    req$.subscribe({
      next: (res) => { this.data = res; this.loading = false; },
      error: () => { this.loading = false; this.errorMsg = 'فشل تحميل البيانات'; },
    });
  }

  setFilter(f: StatusFilter): void { this.filter = f; }

  get visibleGroups(): ('out_of_stock' | 'low_stock' | 'needs_pricing')[] {
    const all: ('out_of_stock' | 'low_stock' | 'needs_pricing')[] = ['out_of_stock', 'low_stock', 'needs_pricing'];
    return this.filter === 'all' ? all : all.filter((g) => g === this.filter);
  }

  rowsFor(group: 'out_of_stock' | 'low_stock' | 'needs_pricing'): RequiredMaterialRow[] {
    return this.data?.[group] ?? [];
  }

  requestFromWarehouse(row: RequiredMaterialRow): void {
    this.router.navigate(['/dashboard/branch-operations/stock-requests/create'], { queryParams: { product_id: row.product_id } });
  }

  goToRequest(row: RequiredMaterialRow): void {
    if (!row.existing_request) return;
    this.router.navigate(['/dashboard/branch-operations/transfers', row.existing_request.id]);
  }
}
