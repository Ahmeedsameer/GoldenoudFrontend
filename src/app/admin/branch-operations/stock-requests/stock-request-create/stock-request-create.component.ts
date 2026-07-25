import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';
import { TransferRequestService, TransferPriority } from '../../../../services/transfer-request.service';
import { ProductService } from '../../../../services/product.service';
import { DatePickerComponent } from '../../../../shared/components/form/date-picker/date-picker.component';

interface DraftItem { product_id: number | null; requested_quantity: number | null; }

/**
 * Stock Request creation — the Branch Manager's entry point onto the same
 * TransferRequest engine طلبات النقل بين الفروع already uses. Deliberately
 * has NO source/destination pickers (unlike transfer-create): the source is
 * always the Main Warehouse and the destination is always the manager's own
 * branch, both enforced server-side by storeStockRequest() — this form only
 * ever sends products/quantities/priority/notes.
 */
@Component({
  selector: 'app-stock-request-create',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent, AlertComponent, DatePickerComponent],
  templateUrl: './stock-request-create.component.html',
})
export class StockRequestCreateComponent implements OnInit {
  private svc = inject(TransferRequestService);
  private productSvc = inject(ProductService);
  private router = inject(Router);

  loading = false;
  saving = false;
  errorMsg = '';

  /** Compound Products are virtual (no inventory) — excluded exactly like the general Transfer form. */
  transferableProducts: { id: number; name: string; sku: string }[] = [];

  priority: TransferPriority = 'normal';
  requestedDate = new Date().toISOString().slice(0, 10);
  notes = '';
  items: DraftItem[] = [{ product_id: null, requested_quantity: null }];

  ngOnInit(): void {
    this.loading = true;
    this.productSvc.getProducts({ per_page: 500, exclude_type: 'COMPOUND' }).subscribe({
      next: (res) => {
        this.transferableProducts = (res.data || []).map((p: any) => ({ id: p.id, name: p.name, sku: p.sku }));
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  addItemRow(): void { this.items.push({ product_id: null, requested_quantity: null }); }
  removeItemRow(i: number): void { this.items.splice(i, 1); }

  private validItems() {
    return this.items.filter((i) => i.product_id && i.requested_quantity && i.requested_quantity > 0);
  }

  save(): void {
    this.errorMsg = '';

    const items = this.validItems();
    if (!items.length) {
      this.errorMsg = 'يجب إضافة صنف واحد على الأقل بكمية صحيحة';
      return;
    }

    this.saving = true;

    const itemsPayload = items.map((i) => ({ product_id: i.product_id!, requested_quantity: i.requested_quantity! }));
    this.svc.createStockRequest({
      requested_date: this.requestedDate,
      priority: this.priority,
      notes: this.notes || undefined,
      items: itemsPayload,
    }).subscribe({
      next: (tr) => { this.saving = false; this.router.navigate(['/dashboard/branch-operations/transfers', tr.id]); },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err?.error?.message || err?.error?.errors?.items?.[0] || 'حدث خطأ أثناء إنشاء طلب المخزون';
      },
    });
  }
}
