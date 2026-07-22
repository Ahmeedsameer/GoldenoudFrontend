import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { TransferRequestService, TransferRequest, TransferStatus } from '../../../../services/transfer-request.service';
import { AuthService } from '../../../../services/auth.service';
import { ReportExportService } from '../../../../services/report-export.service';

const STATUS_LABELS: Record<TransferStatus, string> = {
  draft: 'مسودة', submitted: 'بانتظار الموافقة', approved: 'تمت الموافقة', rejected: 'مرفوض',
  preparing: 'قيد التجهيز', shipped: 'تم الشحن', received: 'تم الاستلام', closed: 'مغلق',
};
const TIMELINE_ORDER: TransferStatus[] = ['submitted', 'approved', 'preparing', 'shipped', 'received', 'closed'];

interface ReceiveRow { item_id: number; product_name: string; requested_quantity: number; received_quantity: number; missing_quantity: number; damaged_quantity: number; notes: string; }

@Component({
  selector: 'app-transfer-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, AlertComponent],
  templateUrl: './transfer-detail.component.html',
})
export class TransferDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(TransferRequestService);
  private auth = inject(AuthService);
  private exportSvc = inject(ReportExportService);

  id!: number;
  loading = false;
  actionLoading = false;
  errorMsg = '';
  transfer: TransferRequest | null = null;

  showRejectForm = false;
  rejectReason = '';
  showCancelForm = false;
  cancelReason = '';
  showReceiveForm = false;
  receiveRows: ReceiveRow[] = [];
  receiveNotes = '';

  timelineOrder = TIMELINE_ORDER;

  get role(): string { return this.auth.getUserRole() ?? ''; }
  get isAdmin(): boolean { return this.role === 'admin'; }
  get isManager(): boolean { return this.role === 'manager'; }
  private get myShopId(): number | null { return this.auth.getUser()?.shop_id ?? null; }

  /** Part 5.1 — inventory ownership determines authority: only the source shop's manager
   * (or admin, who also manages the warehouse) may approve/reject/prepare/ship. */
  get canActOnSource(): boolean {
    if (this.isAdmin) return true;
    return this.isManager && this.myShopId === this.transfer?.source_shop_id;
  }

  /** Only the destination shop's manager (or admin) may confirm receipt. */
  get canActOnDestination(): boolean {
    if (this.isAdmin) return true;
    return this.isManager && this.myShopId === this.transfer?.destination_shop_id;
  }

  /** Closing is bookkeeping only — either side's manager, or admin. */
  get canClose(): boolean {
    if (this.isAdmin) return true;
    return this.isManager && (this.myShopId === this.transfer?.source_shop_id || this.myShopId === this.transfer?.destination_shop_id);
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.get(this.id).subscribe({
      next: (t) => {
        this.transfer = t;
        this.loading = false;
        this.buildReceiveRows();
      },
      error: () => { this.loading = false; this.errorMsg = 'تعذّر تحميل بيانات طلب النقل'; },
    });
  }

  private buildReceiveRows(): void {
    if (!this.transfer) return;
    this.receiveRows = this.transfer.items.map((i) => ({
      item_id: i.id,
      product_name: i.product?.name ?? '',
      requested_quantity: i.requested_quantity,
      received_quantity: i.received_quantity ?? i.requested_quantity,
      missing_quantity: i.missing_quantity ?? 0,
      damaged_quantity: i.damaged_quantity ?? 0,
      notes: i.receiving_notes ?? '',
    }));
  }

  statusLabel(s: string): string { return STATUS_LABELS[s as TransferStatus] ?? s; }

  timelineStepClass(step: TransferStatus): string {
    if (!this.transfer) return '';
    if (this.transfer.status === 'rejected') return step === 'submitted' ? 'done' : 'pending';
    const currentIdx = this.timelineOrder.indexOf(this.transfer.status);
    const stepIdx = this.timelineOrder.indexOf(step);
    if (stepIdx < 0) return 'pending';
    return stepIdx <= currentIdx ? 'done' : 'pending';
  }

  private runAction(obs: import('rxjs').Observable<TransferRequest>): void {
    this.actionLoading = true;
    this.errorMsg = '';
    obs.subscribe({
      next: (t) => { this.transfer = t; this.actionLoading = false; this.buildReceiveRows(); this.showRejectForm = false; this.showCancelForm = false; this.showReceiveForm = false; },
      error: (err) => { this.actionLoading = false; this.errorMsg = err?.error?.message || 'فشل تنفيذ الإجراء'; },
    });
  }

  submit(): void { this.runAction(this.svc.submit(this.id)); }
  approve(): void { this.runAction(this.svc.approve(this.id)); }
  reject(): void {
    if (!this.rejectReason.trim()) return;
    this.runAction(this.svc.reject(this.id, this.rejectReason));
  }
  prepare(): void { this.runAction(this.svc.prepare(this.id)); }
  ship(): void { this.runAction(this.svc.ship(this.id)); }
  close(): void { this.runAction(this.svc.close(this.id)); }
  cancel(): void {
    if (!this.cancelReason.trim()) return;
    this.runAction(this.svc.cancel(this.id, this.cancelReason));
  }

  /** Phase 4.6 — Internal Transfer Invoice exists only once the transfer is approved (see TransferRequestService::generateInternalInvoice). */
  get invoicePath(): string { return `/branch-operations/transfers/${this.id}/invoice/pdf`; }

  printInvoice(): void { this.exportSvc.print(this.invoicePath, {}); }
  downloadInvoice(): void {
    const number = this.transfer?.internal_invoice?.invoice_number ?? `invoice-${this.id}`;
    this.exportSvc.download(this.invoicePath, {}, 'pdf', number);
  }

  submitReceive(): void {
    this.runAction(this.svc.receive(this.id, {
      notes: this.receiveNotes || undefined,
      items: this.receiveRows.map((r) => ({
        item_id: r.item_id, received_quantity: r.received_quantity,
        missing_quantity: r.missing_quantity, damaged_quantity: r.damaged_quantity, notes: r.notes || undefined,
      })),
    }));
  }
}
