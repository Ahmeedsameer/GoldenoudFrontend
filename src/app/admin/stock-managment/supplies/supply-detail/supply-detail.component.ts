import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StockService } from '../../../../services/stock.service';
import { AuthService } from '../../../../services/auth.service';
import { Supply } from '../../../../models/stock.model';
import { BadgeComponent } from '../../../../shared/components/ui/badge/badge.component';
import { ButtonComponent } from '../../../../shared/components/ui/button/button.component';
import { LoadingComponent } from '../../../../loading/loading.component';
import { AlertComponent } from '../../../../shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-supply-detail',
  imports: [CommonModule, RouterLink, BadgeComponent, ButtonComponent, LoadingComponent, AlertComponent],
  templateUrl: './supply-detail.component.html',
  styleUrl: './supply-detail.component.css',
})
export class SupplyDetailComponent implements OnInit {
  private stockService = inject(StockService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  supplyId!: number;
  supply: Supply | null = null;
  loading = false;

  get isAdmin(): boolean { return this.auth.getUserRole() === 'admin'; }
  get isManager(): boolean { return this.auth.getUserRole() === 'manager'; }
  get canCancel(): boolean { return this.isAdmin || this.isManager; }

  showCancelConfirm = false;
  cancelLoading = false;
  cancelError = '';

  ngOnInit(): void {
    this.supplyId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadSupply();
  }

  loadSupply() {
    this.loading = true;
    this.stockService.getSupplyById(this.supplyId).subscribe({
      next: (res) => {
        this.supply = res.data || res;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  calcTotal(): number {
    if (!this.supply?.items) return 0;
    return this.supply.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }

  confirmCancel(): void {
    this.cancelError = '';
    this.showCancelConfirm = true;
  }

  cancelSupply(): void {
    this.cancelLoading = true;
    this.cancelError = '';
    this.stockService.cancelSupply(this.supplyId).subscribe({
      next: (res) => {
        this.supply = res.data || res;
        this.cancelLoading = false;
        this.showCancelConfirm = false;
      },
      error: (err) => {
        this.cancelLoading = false;
        this.cancelError = err?.error?.message || 'تعذّر إلغاء الفاتورة';
      },
    });
  }
}
