import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  private readonly API_URL = `${environment.apiUrl}/auth`;

  forgotForm: FormGroup;
  loading = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  constructor() {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get f() {
    return this.forgotForm.controls;
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.error.set(null);

    if (this.forgotForm.invalid) {
      return;
    }

    this.loading.set(true);

    const sub = this.http.post(`${this.API_URL}/password-reset/`, { email: this.forgotForm.value.email })
      .subscribe({
        next: () => {
          this.success.set(true);
          this.loading.set(false);
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (error) => {
          this.loading.set(false);
          this.error.set(error.error?.detail || 'Une erreur est survenue. Veuillez réessayer.');
        },
      });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
