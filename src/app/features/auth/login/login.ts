import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  loginForm: FormGroup;
  loading = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);
  returnUrl = signal('/app');

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.returnUrl.set(this.route.snapshot.queryParams['returnUrl'] || '/app');

    if (this.authService.isLoggedInValue()) {
      this.router.navigate([this.returnUrl()]);
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.error.set(null);

    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);

    this.authService.login(this.loginForm.value)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: () => {
          this.router.navigate([this.returnUrl()]);
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set(error.error?.detail || 'Identifiants invalides');
        },
      });
  }
}
