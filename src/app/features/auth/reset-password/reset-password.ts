import { Component, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  private readonly API_URL = `${environment.apiUrl}/auth`;

  resetForm: FormGroup;
  loading = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  tokenValid = signal(true);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  token = signal<string | null>(null);

  constructor() {
    this.resetForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParams['token'] || null);

    if (!this.token()) {
      this.tokenValid.set(false);
      this.error.set('Token invalide ou expiré. Veuillez refaire une demande.');
    }
  }

  get f() {
    return this.resetForm.controls;
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.error.set(null);

    if (this.resetForm.invalid) {
      return;
    }

    this.loading.set(true);

    const sub = this.http.post(`${this.API_URL}/password-reset/confirm/`, {
      token: this.token(),
      new_password: this.resetForm.value.password,
    }).subscribe({
      next: () => {
        this.success.set(true);
        this.loading.set(false);
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.loading.set(false);
        if (error.status === 400) {
          this.error.set(error.error?.detail || 'Lien invalide ou expiré.');
          this.tokenValid.set(false);
        } else {
          this.error.set(error.error?.detail || 'Une erreur est survenue. Veuillez réessayer.');
        }
      },
    });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  private passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
