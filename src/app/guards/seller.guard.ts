import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const sellerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);

  if (authService.isSeller()) {
    return true;
  }

  // Not authenticated at all — send to sign-in instead of falling through to
  // the wildcard 404 route. A logged-in user with the wrong role still just
  // fails the match (unchanged) — this only fixes the unauthenticated case.
  if (!authService.isAuthenticated()) {
    return inject(Router).createUrlTree(['/signin']);
  }

  return false;
};
