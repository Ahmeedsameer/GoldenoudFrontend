import { Injectable } from '@angular/core';

/**
 * Single source of truth for "click this row, go to its detail page" links
 * used across every report. Centralized so a route never has to be updated
 * in more than one place, and so it's obvious which drill-down targets
 * exist yet and which don't.
 *
 * Existing targets: Product Details, Supplier Profile.
 * NOT YET BUILT (return null — callers must render plain text, not a link):
 * Branch Dashboard, Employee Profile, Customer Profile. Wire these up here
 * the moment those pages exist; nothing else should hardcode these routes.
 */
@Injectable({ providedIn: 'root' })
export class DrillDownService {
  productLink(productId: number | string | null | undefined): any[] | null {
    return productId != null ? ['/dashboard/products/view', productId] : null;
  }

  supplierLink(supplierId: number | string | null | undefined): any[] | null {
    return supplierId != null ? ['/dashboard/stock/suppliers', supplierId] : null;
  }

  /** Branch Dashboard doesn't exist yet — returns null until it's built. */
  branchLink(_shopId: number | string | null | undefined): any[] | null {
    return null;
  }

  /** Employee Profile doesn't exist yet — returns null until it's built. */
  sellerLink(_sellerId: number | string | null | undefined): any[] | null {
    return null;
  }

  /** Customer Profile doesn't exist yet — returns null until it's built. */
  customerLink(_customerId: number | string | null | undefined): any[] | null {
    return null;
  }
}
