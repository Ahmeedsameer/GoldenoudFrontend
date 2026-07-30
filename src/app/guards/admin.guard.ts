import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {

  const authService = inject(AuthService);

  if (authService.isAdmin()) {
    return true;
  }

  // Not authenticated at all (no/expired session) — send to sign-in instead
  // of letting the router fall through to the wildcard 404 route. A logged-in
  // user with the wrong role still just fails the match (unchanged) — this
  // only fixes the genuinely-unauthenticated case, not authorization itself.
  if (!authService.isAuthenticated()) {
    return inject(Router).createUrlTree(['/signin']);
  }

  return false;
};
