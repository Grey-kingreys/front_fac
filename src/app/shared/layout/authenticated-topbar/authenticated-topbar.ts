import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-authenticated-topbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './authenticated-topbar.html',
  styleUrl: './authenticated-topbar.css',
})
export class AuthenticatedTopbar {
  @Output() toggleSidebar = new EventEmitter<void>();

  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  get companyLabel(): string {
    const user = this.currentUser();
    if (!user) {
      return 'Entreprise';
    }

    return user.company_id ? `Entreprise #${user.company_id}` : 'Entreprise';
  }

  get initials(): string {
    const user = this.currentUser();
    if (!user) {
      return 'U';
    }

    return `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || 'U';
  }

  onToggle(): void {
    this.toggleSidebar.emit();
  }

  logout(): void {
    this.authService.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
    });
  }
}
