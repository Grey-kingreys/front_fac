import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  loginForm: FormGroup;
  loading = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);
  returnUrl = signal('/dashboard');
  showPassword = signal(false);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.returnUrl.set(this.route.snapshot.queryParams['returnUrl'] || '/dashboard');

    if (this.authService.isLoggedInValue()) {
      this.router.navigate([this.returnUrl()]);
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.error.set(null);

    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);

    const subscription = this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.loading.set(false);
        const user = this.authService.getCurrentUser();
        const defaultRoute = this.getDefaultRouteForRole(user);
        const redirectUrl = this.returnUrl() === '/dashboard' ? defaultRoute : this.returnUrl();
        this.router.navigate([redirectUrl]);
      },
      error: (error) => {
        this.loading.set(false);
        this.handleLoginError(error);
      },
    });

    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }

  private getDefaultRouteForRole(user: any | null): string {
    if (!user) {
      return '/dashboard';
    }

    switch (user.role) {
      case 'chauffeur':
        return '/logistique';
      case 'caissier':
        return '/stocks';
      default:
        return '/dashboard';
    }
  }

  private handleLoginError(error: any): void {
    const status = error.status;
    const detail = error.error?.detail;

    if (status === 401) {
      this.error.set(detail || 'Identifiants invalides');
    } else if (status === 403) {
      this.error.set(detail || 'Compte bloqué après 5 tentatives. Veuillez réessayer plus tard.');
    } else if (status === 400) {
      this.error.set(detail || 'Erreur de validation. Veuillez vérifier vos données.');
    } else {
      this.error.set(detail || 'Une erreur est survenue. Veuillez réessayer.');
    }
  }
}
