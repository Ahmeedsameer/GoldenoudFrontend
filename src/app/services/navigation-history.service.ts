import { Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';

/**
 * Tracks how many in-app route changes have happened this SPA session, so a
 * "Back" button can tell the difference between "the user actually navigated
 * here from another page in this app" (safe to use real browser/Angular
 * history) and "this page was opened directly" — a fresh tab, a deep link, a
 * page refresh, or a URL typed/pasted in — where there is no in-app history
 * to go back to and `Location.back()` would either do nothing or leave the
 * app entirely.
 *
 * Native `window.history.length` can't answer this: it counts the whole
 * browser tab's history, not this app's, so it's nonzero even on a fresh
 * direct load. This service counts NavigationEnd events instead, which only
 * fire for real in-app route changes.
 *
 * Instantiated eagerly from AppComponent's constructor (providedIn: 'root'
 * alone is NOT enough — a lazily-created singleton would miss every
 * navigation that happened before something first injected it).
 */
@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private router = inject(Router);
  private location = inject(Location);
  private routeChangeCount = 0;

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.routeChangeCount++;
      }
    });
  }

  /** True once the user has made at least one in-app navigation before the current page. */
  canGoBack(): boolean {
    return this.routeChangeCount > 1;
  }

  /**
   * Goes back exactly like normal browser/app navigation when there's
   * somewhere to go back to; otherwise navigates to `fallbackUrl` (the most
   * appropriate default for the page calling this — e.g. an invoice's own
   * list — never a leftover/unrelated hardcoded route baked into every page).
   */
  back(fallbackUrl: string): void {
    if (this.canGoBack()) {
      this.location.back();
    } else {
      this.router.navigateByUrl(fallbackUrl);
    }
  }
}
