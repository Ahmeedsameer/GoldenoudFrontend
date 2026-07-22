import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { InventoryCountService, CountSession } from '../../../../services/inventory-count.service';
import { AuthService } from '../../../../services/auth.service';

const STATUS_LABELS: Record<string, string> = { counting: 'جاري الجرد', review: 'قيد المراجعة', approved: 'تمت الموافقة', completed: 'مكتمل' };

@Component({
  selector: 'app-count-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent],
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

  get isAdmin(): boolean { return this.auth.getUserRole() === 'admin'; }

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

  itemsWithDifference() {
    return this.session?.items.filter((i) => this.diff(i) !== 0) ?? [];
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
    this.svc.setItemReason(this.id, itemId, reason).subscribe({ next: () => {}, error: () => {} });
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
