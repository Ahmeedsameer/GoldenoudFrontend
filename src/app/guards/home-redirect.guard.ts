import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Root path ('/') has no page of its own — it only ever redirects.
 *  Authenticated: send to /dashboard (the canMatch guards there resolve the
 *  correct role layout). Not authenticated: send to /signin. Never resolves
 *  to `true`, so there is never a blank page at '/'. */
export const homeRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated()
    ? router.createUrlTree(['/dashboard'])
    : router.createUrlTree(['/signin']);
};
