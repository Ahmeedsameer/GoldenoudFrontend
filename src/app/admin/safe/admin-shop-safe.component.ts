import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SafeService } from '../../services/safe.service';
import { Safe } from '../../models/safe.model';
import { LoadingComponent } from '../../loading/loading.component';

@Component({
  selector: 'app-admin-shop-safe',
  imports: [CommonModule, RouterLink, LoadingComponent],
  templateUrl: './admin-shop-safe.component.html',
})
export class AdminShopSafeComponent implements OnInit {
  private safeService = inject(SafeService);
  private route = inject(ActivatedRoute);

  /** Can be provided as an @Input when embedded in shop-detail,
   *  otherwise falls back to route param. */
  @Input() shopId?: number;

  safes: Safe[] = [];
  loading = false;

  ngOnInit(): void {
    if (!this.shopId) {
      this.shopId = +this.route.snapshot.params['shopId'];
    }
    this.load();
  }

  load() {
    this.loading = true;
    this.safeService.getShopSafes(this.shopId).subscribe({
      next: (res) => { this.safes = res.data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  safeName(safe: Safe): string {
    return `${safe.safe_type?.name}`;
  }
}
