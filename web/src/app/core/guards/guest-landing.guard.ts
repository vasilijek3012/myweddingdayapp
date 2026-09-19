import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Sends non-authenticated visitors straight to /deals instead of the Home page
// when they land on '/' — logged-in users still see Home.
export const guestLandingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn) {
    return true;
  }

  return router.parseUrl('/deals');
};
