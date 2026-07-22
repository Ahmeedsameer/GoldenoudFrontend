import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminStockIntelligenceService, InventoryDashboard } from '../../../services/admin-stock-intelligence.service';
import { LoadingComponent } from '../../../loading/loading.component';
import { ReportToolbarComponent } from '../../../shared/components/common/report-toolbar/report-toolbar.component';

/**
 * The main inventory overview — one screen answering "how much do we have,
 * of what, and what needs attention" across every branch. Reads the same
 * Goods/SupplyItem data as Stock Intelligence and Purchasing; never writes.
 */
@Component({
  selector: 'app-inventory-dashboard',
  imports: [CommonModule, RouterLink, LoadingComponent, ReportToolbarComponent],
  templateUrl: './inventory-dashboard.component.html',
})
export class InventoryDashboardComponent implements OnInit {
  private svc = inject(AdminStockIntelligenceService);

  loading = false;
  data: InventoryDashboard | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.getDashboard().subscribe({
      next: (d) => { this.data = d; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }
}
