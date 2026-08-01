import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';


export const guestGuard: CanActivateFn = (route, state) => {

  const authService = inject(AuthService);

  if (authService.isAuthenticated()) {
    // Already logged in — send straight to the dashboard, never to the
    // (redirect-only) root route.
    return inject(Router).createUrlTree(['/dashboard']);
  }

  return true;
};
