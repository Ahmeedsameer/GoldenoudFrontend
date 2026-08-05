import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { ModalComponent } from '../../../../shared/components/ui/modal/modal.component';
import { ReportToolbarComponent } from '../../../../shared/components/common/report-toolbar/report-toolbar.component';
import {
  InventoryCountService, CountSession, CountItem, ReasonType,
  REASON_TYPES, REASON_TYPE_LABELS, DifferenceStatus, differenceStatus,
} from '../../../../services/inventory-count.service';
import { AuthService } from '../../../../services/auth.service';

const STATUS_LABELS: Record<string, string> = { counting: 'جاري الجرد', review: 'قيد المراجعة', approved: 'تمت الموافقة', completed: 'مكتمل' };

type FilterOption = 'all' | 'match' | 'shortage' | 'excess' | 'not_counted' | 'adjusted' | 'not_adjusted';

@Component({
  selector: 'app-count-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent, ModalComponent, ReportToolbarComponent],
  templateUrl: './count-detail.component.html',
})
export class CountDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(InventoryCountService);
  private auth = inject(AuthService);

  id!: number;
  loading = false;
  actionLoading = false;
  errorMsg = '';
  session: CountSession | null = null;

  physicalQty: Record<number, number | null> = {};
  itemReasons: Record<number, string> = {};
  itemReasonTypes: Record<number, ReasonType | ''> = {};

  reasonTypes = REASON_TYPES;
  reasonTypeLabel = (t: ReasonType | null) => (t ? REASON_TYPE_LABELS[t] : '—');

  // ── Filters + search ──────────────────────────────────────────────────
  filter: FilterOption = 'all';
  search = '';

  // ── Product detail drawer ────────────────────────────────────────────
  selectedItem: CountItem | null = null;

  get isAdmin(): boolean { return this.auth.getUserRole() === 'admin'; }

  get exportParams(): Record<string, any> { return {}; }

  /** Reached via either /branch-operations/counts/:id or /reports/counts/:id — same component, return to whichever list the user came from. */
  get backLink(): string {
    return this.route.snapshot.pathFromRoot.some((s) => s.routeConfig?.path === 'reports/counts/:id')
      ? '/dashboard/reports/counts'
      : '/dashboard/branch-operations/counts';
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.get(this.id).subscribe({
      next: (s) => {
        this.session = s;
        s.items.forEach((i) => {
          this.physicalQty[i.id] = i.physical_quantity ?? null;
          this.itemReasons[i.id] = i.reason ?? '';
          this.itemReasonTypes[i.id] = i.reason_type ?? '';
        });
        this.loading = false;
      },
      error: () => { this.loading = false; this.errorMsg = 'تعذّر تحميل جلسة الجرد'; },
    });
  }

  statusLabel(s: string): string { return STATUS_LABELS[s] ?? s; }

  /** item.difference comes back as a decimal-cast string (e.g. "0.000") from Laravel — always compare via this, never raw !==. */
  diff(item: { difference: number | string | null }): number {
    return item.difference != null ? Number(item.difference) : 0;
  }

  diffStatus(item: CountItem): DifferenceStatus {
    return differenceStatus(item);
  }

  diffStatusLabel(status: DifferenceStatus): string {
    return { match: 'مطابق', shortage: 'عجز', excess: 'زيادة', pending: 'غير معدود' }[status];
  }

  diffStatusClass(status: DifferenceStatus): string {
    switch (status) {
      case 'match': return 'bg-[#D1FAE5] text-[#065F46]';
      case 'shortage': return 'bg-[#FEE2E2] text-[#B91C1C]';
      case 'excess': return 'bg-[#DBEAFE] text-[#1E40AF]';
      default: return 'bg-[#F3F4F6] text-[#6B7280]';
    }
  }

  itemsWithDifference() {
    return this.session?.items.filter((i) => this.diff(i) !== 0) ?? [];
  }

  /** Applies the match/shortage/excess filter + name/sku/barcode search — display-only, never mutates session.items. */
  get filteredItems(): CountItem[] {
    if (!this.session) return [];
    let items = this.session.items;

    if (this.filter === 'match' || this.filter === 'shortage' || this.filter === 'excess') {
      items = items.filter((i) => this.diffStatus(i) === this.filter);
    } else if (this.filter === 'not_counted') {
      // "Not Counted" (never recorded this session) is distinct from "Matched"
      // (counted AND zero difference) — differenceStatus() returns 'pending'
      // for a null physical_quantity, which is exactly this bucket.
      items = items.filter((i) => this.diffStatus(i) === 'pending');
    } else if (this.filter === 'adjusted') {
      items = items.filter((i) => !!i.adjustment_applied);
    } else if (this.filter === 'not_adjusted') {
      items = items.filter((i) => !i.adjustment_applied);
    }

    const term = this.search.trim().toLowerCase();
    if (term) {
      items = items.filter((i) =>
        (i.product?.name || '').toLowerCase().includes(term) ||
        (i.product?.sku || '').toLowerCase().includes(term) ||
        (i.product?.barcode || '').toLowerCase().includes(term)
      );
    }

    return items;
  }

  setFilter(f: FilterOption): void {
    this.filter = f;
  }

  openDetail(item: CountItem): void {
    this.selectedItem = item;
  }

  closeDetail(): void {
    this.selectedItem = null;
  }

  saveCounts(): void {
    if (!this.session) return;
    const items = this.session.items
      .filter((i) => this.physicalQty[i.id] != null)
      .map((i) => ({ item_id: i.id, physical_quantity: this.physicalQty[i.id] as number }));
    if (!items.length) return;

    this.actionLoading = true;
    this.errorMsg = '';
    this.svc.recordCounts(this.id, items).subscribe({
      next: (s) => { this.session = s; this.actionLoading = false; },
      error: (err) => { this.actionLoading = false; this.errorMsg = err?.error?.message || 'فشل حفظ الكميات'; },
    });
  }

  submitForReview(): void {
    this.actionLoading = true;
    this.errorMsg = '';
    this.svc.submitForReview(this.id).subscribe({
      next: () => { this.actionLoading = false; this.load(); },
      error: (err) => { this.actionLoading = false; this.errorMsg = err?.error?.message || 'فشل إرسال الجلسة للمراجعة'; },
    });
  }

  saveReason(itemId: number): void {
    const reason = this.itemReasons[itemId];
    if (!reason?.trim()) return;
    const reasonType = this.itemReasonTypes[itemId] || null;
    this.svc.setItemReason(this.id, itemId, reason, reasonType || undefined).subscribe({ next: () => {}, error: () => {} });
  }

  approve(): void {
    this.actionLoading = true;
    this.errorMsg = '';
    this.svc.approve(this.id).subscribe({
      next: () => { this.actionLoading = false; this.load(); },
      error: (err) => { this.actionLoading = false; this.errorMsg = err?.error?.message || 'فشل اعتماد الجلسة'; },
    });
  }

  adjustInventory(): void {
    this.actionLoading = true;
    this.errorMsg = '';
    this.svc.adjustInventory(this.id).subscribe({
      next: () => { this.actionLoading = false; this.load(); },
      error: (err) => { this.actionLoading = false; this.errorMsg = err?.error?.message || 'فشل تنفيذ تسوية المخزون'; },
    });
  }
}
