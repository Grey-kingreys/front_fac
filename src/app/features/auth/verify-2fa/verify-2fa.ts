import { Component, inject, computed, signal, OnDestroy, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-verify-2fa',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verify-2fa.html',
})
export class VerifyTwoFactor implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChildren('otpBox') otpBoxes!: QueryList<ElementRef<HTMLInputElement>>;

  pending = computed(() => this.authService.twoFactorPending());

  digits = signal<string[]>(['', '', '', '', '', '']);
  loading = signal(false);
  error = signal<string | null>(null);
  resendCooldown = signal(0);
  resendSuccess = signal(false);

  private resendTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    if (!this.pending()) {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    if (this.resendTimer) clearInterval(this.resendTimer);
  }

  get code(): string {
    return this.digits().join('');
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');

    if (raw.length > 1) {
      this.pasteFill(index, raw);
      return;
    }

    const newDigits = [...this.digits()];
    newDigits[index] = raw ? raw[0] : '';
    this.digits.set(newDigits);
    input.value = newDigits[index];

    if (raw && index < 5) {
      this.focus(index + 1);
    }
    if (newDigits.every(d => d !== '')) this.submit();
  }

  onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      const newDigits = [...this.digits()];
      newDigits[index - 1] = '';
      this.digits.set(newDigits);
      this.focus(index - 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    this.pasteFill(0, pasted);
  }

  private pasteFill(startIndex: number, raw: string): void {
    const chars = raw.replace(/\D/g, '').slice(0, 6 - startIndex).split('');
    const newDigits = [...this.digits()];
    chars.forEach((c, i) => { newDigits[startIndex + i] = c; });
    this.digits.set(newDigits);
    const nextFocus = Math.min(startIndex + chars.length, 5);
    this.focus(nextFocus);
    if (newDigits.every(d => d !== '')) this.submit();
  }

  private focus(index: number): void {
    setTimeout(() => this.otpBoxes.toArray()[index]?.nativeElement.focus());
  }

  submit(): void {
    const code = this.code;
    if (code.length !== 6 || this.loading()) return;

    const pending = this.pending();
    if (!pending) return;

    this.loading.set(true);
    this.error.set(null);

    this.authService.loginVerify2fa(pending.tempToken, code).subscribe({
      next: () => {
        this.loading.set(false);
        const user = this.authService.getCurrentUser();
        const route =
          user?.role === 'chauffeur' ? '/logistique' :
          user?.role === 'caissier' ? '/stocks' : '/dashboard';
        this.router.navigate([route]);
      },
      error: (err) => {
        this.loading.set(false);
        this.digits.set(['', '', '', '', '', '']);
        this.focus(0);
        this.error.set(err?.error?.detail || 'Code invalide. Veuillez réessayer.');
      },
    });
  }

  resend(): void {
    const pending = this.pending();
    if (!pending || this.resendCooldown() > 0) return;

    this.authService.resend2faCode(pending.tempToken).subscribe({
      next: () => {
        this.resendSuccess.set(true);
        this.resendCooldown.set(60);
        this.resendTimer = setInterval(() => {
          const n = this.resendCooldown() - 1;
          if (n <= 0) {
            this.resendCooldown.set(0);
            clearInterval(this.resendTimer!);
            this.resendTimer = null;
          } else {
            this.resendCooldown.set(n);
          }
        }, 1000);
      },
      error: () => {},
    });
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
