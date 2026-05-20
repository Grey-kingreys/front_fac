import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];

  if (!authService.isLoggedInValue() || !authService.hasValidToken()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const currentUser = authService.getCurrentUser();

  if (!currentUser || !requiredRoles.includes(currentUser.role)) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
