import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';
import { SearchBarComponent } from '../../../shared/components/common/search-bar/search-bar.component';
import {
  TransferRequestService, GlobalMaterialStatusByBranch, MaterialAcrossBranches, RequiredMaterialRow,
} from '../../../services/transfer-request.service';

type ViewTab = 'by-branch' | 'by-material';
type StatusFilter = 'all' | 'out_of_stock' | 'low_stock' | 'needs_pricing' | 'pending';

/**
 * Global Branch Material Status (admin, cross-branch command center) — reuses
 * RequiredMaterialsService::forAllBranches()/byMaterial() entirely; never a
 * second inventory engine. "Request Material" / "نقل مخزون" deep-link into
 * the EXISTING Stock Request / Transfer create screens (both now accept
 * pre-fill query params) — no new request/transfer form is created here.
 */
@Component({
  selector: 'app-global-material-status',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, ReportToolbarComponent, SearchBarComponent],
  templateUrl: './global-material-status.component.html',
})
export class GlobalMaterialStatusComponent implements OnInit {
  private svc = inject(TransferRequestService);
  private router = inject(Router);

  loading = false;
  errorMsg = '';

  tab: ViewTab = 'by-branch';
  byBranchData: GlobalMaterialStatusByBranch | null = null;
  byMaterialData: MaterialAcrossBranches[] = [];

  filter: StatusFilter = 'all';
  search = '';
  categoryFilter = '';
  supplierFilter = '';
  branchFilter: number | null = null;

  ngOnInit(): void {
    this.load();
  }

  setTab(tab: ViewTab): void {
    this.tab = tab;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMsg = '';

    if (this.tab === 'by-branch') {
      this.svc.getGlobalStatusByBranch().subscribe({
        next: (res) => { this.byBranchData = res; this.loading = false; },
        error: () => { this.loading = false; this.errorMsg = 'فشل تحميل البيانات'; },
      });
    } else {
      this.svc.getGlobalStatusByMaterial().subscribe({
        next: (res) => { this.byMaterialData = res.rows; this.loading = false; },
        error: () => { this.loading = false; this.errorMsg = 'فشل تحميل البيانات'; },
      });
    }
  }

  setFilter(f: StatusFilter): void { this.filter = f; }

  // ── By Branch helpers ────────────────────────────────────────────────────
  get filteredBranches() {
    const branches = this.byBranchData?.branches ?? [];
    return this.branchFilter ? branches.filter((b) => b.shop_id === this.branchFilter) : branches;
  }

  rowsFor(branch: any, group: 'out_of_stock' | 'low_stock' | 'needs_pricing'): RequiredMaterialRow[] {
    const rows: RequiredMaterialRow[] = branch[group] ?? [];
    if (!this.search) return rows;
    const q = this.search.trim().toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }

  visibleGroups(): ('out_of_stock' | 'low_stock' | 'needs_pricing')[] {
    if (this.filter === 'out_of_stock') return ['out_of_stock'];
    if (this.filter === 'low_stock') return ['low_stock'];
    if (this.filter === 'needs_pricing') return ['needs_pricing'];
    return ['out_of_stock', 'low_stock', 'needs_pricing'];
  }

  requestFromWarehouse(row: RequiredMaterialRow, shopId: number): void {
    this.router.navigate(['/dashboard/branch-operations/stock-requests/create'], {
      queryParams: { product_id: row.product_id, destination_shop_id: shopId },
    });
  }

  goToRequest(row: RequiredMaterialRow): void {
    if (!row.existing_request) return;
    this.router.navigate(['/dashboard/branch-operations/transfers', row.existing_request.id]);
  }

  // ── By Material helpers ──────────────────────────────────────────────────
  get filteredMaterials(): MaterialAcrossBranches[] {
    let rows = this.byMaterialData;
    if (this.filter === 'needs_pricing') rows = rows.filter((r) => !r.is_priced);
    if (this.filter === 'out_of_stock') rows = rows.filter((r) => r.branches.some((b) => b.status === 'out_of_stock'));
    if (this.filter === 'low_stock') rows = rows.filter((r) => r.branches.some((b) => b.status === 'low_stock'));
    if (this.categoryFilter) rows = rows.filter((r) => r.category === this.categoryFilter);
    if (this.supplierFilter) rows = rows.filter((r) => r.supplier?.name === this.supplierFilter);
    if (this.search) {
      const q = this.search.trim().toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    return rows;
  }

  get categories(): string[] {
    return [...new Set(this.byMaterialData.map((r) => r.category).filter((c): c is string => !!c))];
  }

  get suppliers(): string[] {
    return [...new Set(this.byMaterialData.map((r) => r.supplier?.name).filter((s): s is string => !!s))];
  }

  transferStock(row: MaterialAcrossBranches, deficitShopId: number): void {
    if (!row.surplus_branch) return;
    this.router.navigate(['/dashboard/branch-operations/transfers/create'], {
      queryParams: { source_shop_id: row.surplus_branch.shop_id, destination_shop_id: deficitShopId, product_id: row.product_id },
    });
  }

  statusLabel(status: string): string {
    return status === 'out_of_stock' ? 'نفد المخزون' : status === 'low_stock' ? 'مخزون منخفض' : 'متوفر';
  }

  statusClass(status: string): string {
    if (status === 'out_of_stock') return 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400';
    if (status === 'low_stock') return 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
    return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400';
  }
}
