import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AUTH_ENABLED } from './auth.config';
import { AuthService } from './auth.service';

/** Tant que l’auth est coupée, /login ne doit pas s’afficher. */
export const loginRedirect: CanActivateFn = () => {
  if (!AUTH_ENABLED) {
    return inject(Router).createUrlTree(['/lab']);
  }
  return true;
};

export const authGuard: CanActivateFn = () => {
  if (!AUTH_ENABLED) {
    return true;
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};
