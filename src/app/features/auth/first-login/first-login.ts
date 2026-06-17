import { Component, inject, signal, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-first-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './first-login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirstLogin implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  private readonly API_URL = `${environment.apiUrl}/auth`;

  firstLoginForm: FormGroup;
  loading = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  tokenValid = signal(false);
  checking = signal(true);
  userEmail = signal<string | null>(null);
  companyName = signal<string | null>(null);
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  token = signal<string | null>(null);

  constructor() {
    this.firstLoginForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    const t = this.route.snapshot.queryParams['token'] || null;
    this.token.set(t);

    if (!t) {
      this.checking.set(false);
      this.error.set('Lien invalide. Contactez votre administrateur.');
      return;
    }

    // Valider le token auprès du backend avant d'afficher le formulaire
    const sub = this.http.get<{ success: boolean; data?: { email: string; company: string | null }; message: string }>(
      `${this.API_URL}/first-login/?token=${t}`
    ).subscribe({
      next: (res) => {
        this.tokenValid.set(true);
        this.userEmail.set(res.data?.email ?? null);
        this.companyName.set(res.data?.company ?? null);
        this.checking.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Ce lien est invalide ou a déjà été utilisé. Contactez votre administrateur.');
        this.checking.set(false);
      },
    });

    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  get f() {
    return this.firstLoginForm.controls;
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

    if (this.firstLoginForm.invalid) {
      return;
    }

    this.loading.set(true);

    const sub = this.http.post(`${this.API_URL}/first-login/`, {
      token: this.token(),
      password: this.firstLoginForm.value.password,
      password_confirm: this.firstLoginForm.value.confirmPassword,
    }).subscribe({
      next: () => {
        this.success.set(true);
        this.loading.set(false);
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || err.error?.detail;
        if (msg) {
          this.error.set(msg);
        } else if (err.error?.errors) {
          const firstError = Object.values(err.error.errors)[0] as string;
          this.error.set(firstError);
        } else {
          this.error.set('Une erreur est survenue. Veuillez réessayer.');
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
