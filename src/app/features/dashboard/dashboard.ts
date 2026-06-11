import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth';

export type RoleGroup = 'superadmin' | 'manager' | 'stock' | 'cashier' | 'driver' | 'commercial' | 'other';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;

  roleGroup = computed((): RoleGroup => {
    const role = this.currentUser()?.role;
    switch (role) {
      case 'superadmin':                        return 'superadmin';
      case 'admin': case 'superviseur':         return 'manager';
      case 'gestionnaire_stock':                return 'stock';
      case 'caissier':                          return 'cashier';
      case 'chauffeur':                         return 'driver';
      case 'commercial':                        return 'commercial';
      default:                                  return 'other';
    }
  });
}
