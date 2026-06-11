import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../core/services/auth';

type UserRole =
  | 'superadmin' | 'admin' | 'superviseur' | 'gestionnaire_stock'
  | 'caissier' | 'chauffeur' | 'maintenancier' | 'commercial';

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Administrateur',
  admin: 'Administrateur',
  superviseur: 'Superviseur',
  gestionnaire_stock: 'Gestionnaire de Stock',
  caissier: 'Caissier',
  chauffeur: 'Chauffeur',
  maintenancier: 'Maintenancier',
  commercial: 'Commercial',
};

const ROLE_BADGE: Record<UserRole, string> = {
  superadmin: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  superviseur: 'bg-purple-50 text-purple-700 border-purple-200',
  gestionnaire_stock: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  caissier: 'bg-green-50 text-green-700 border-green-200',
  chauffeur: 'bg-orange-50 text-orange-700 border-orange-200',
  maintenancier: 'bg-slate-50 text-slate-600 border-slate-200',
  commercial: 'bg-teal-50 text-teal-700 border-teal-200',
};

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPwd = control.get('new_password')?.value;
  const confirm = control.get('new_password_confirm')?.value;
  if (newPwd && confirm && newPwd !== confirm) {
    return { passwordsMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
})
export class Profile {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  currentUser = computed(() => this.authService.currentUser());

  // ── Modals ──────────────────────────────────────────────────────────────────
  showEditModal = signal(false);
  showPasswordModal = signal(false);

  // ── État formulaires ─────────────────────────────────────────────────────────
  editLoading = signal(false);
  editError = signal<string | null>(null);
  editSuccess = signal(false);

  pwdLoading = signal(false);
  pwdError = signal<string | null>(null);
  pwdSuccess = signal(false);
  showCurrentPwd = signal(false);
  showNewPwd = signal(false);

  // ── Formulaire édition profil ────────────────────────────────────────────────
  editForm = this.fb.group({
    first_name: ['', [Validators.required, Validators.maxLength(50)]],
    last_name: ['', [Validators.required, Validators.maxLength(50)]],
    phone: ['', [Validators.maxLength(20)]],
  });

  // ── Formulaire changement mot de passe ───────────────────────────────────────
  passwordForm = this.fb.group(
    {
      current_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      new_password_confirm: ['', Validators.required],
    },
    { validators: passwordsMatchValidator }
  );

  // ── Helpers rôle ─────────────────────────────────────────────────────────────
  getRoleLabel(role: string): string {
    return ROLE_LABELS[role as UserRole] || role;
  }

  getRoleBadgeClass(role: string): string {
    return ROLE_BADGE[role as UserRole] || 'bg-slate-50 text-slate-600 border-slate-200';
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return 'U';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return user.email[0].toUpperCase();
  }

  // ── Ouvrir/fermer modals ─────────────────────────────────────────────────────
  openEditModal(): void {
    const user = this.currentUser();
    this.editForm.reset({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
    });
    this.editError.set(null);
    this.editSuccess.set(false);
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  openPasswordModal(): void {
    this.passwordForm.reset();
    this.pwdError.set(null);
    this.pwdSuccess.set(false);
    this.showPasswordModal.set(true);
  }

  closePasswordModal(): void {
    this.showPasswordModal.set(false);
  }

  // ── Soumission édition profil ────────────────────────────────────────────────
  submitEditProfile(): void {
    if (this.editForm.invalid || this.editLoading()) return;

    this.editLoading.set(true);
    this.editError.set(null);

    const { first_name, last_name, phone } = this.editForm.value;
    this.authService.updateProfile({ first_name: first_name!, last_name: last_name!, phone: phone || '' }).subscribe({
      next: () => {
        this.editLoading.set(false);
        this.editSuccess.set(true);
        setTimeout(() => this.closeEditModal(), 1200);
      },
      error: (err) => {
        this.editLoading.set(false);
        const msg = err?.error?.detail || err?.error?.first_name?.[0] || err?.error?.last_name?.[0] || 'Une erreur est survenue.';
        this.editError.set(msg);
      },
    });
  }

  // ── Soumission changement mot de passe ───────────────────────────────────────
  submitChangePassword(): void {
    if (this.passwordForm.invalid || this.pwdLoading()) return;

    this.pwdLoading.set(true);
    this.pwdError.set(null);

    const { current_password, new_password, new_password_confirm } = this.passwordForm.value;
    this.authService.changePassword({
      current_password: current_password!,
      new_password: new_password!,
      new_password_confirm: new_password_confirm!,
    }).subscribe({
      next: () => {
        this.pwdLoading.set(false);
        this.pwdSuccess.set(true);
        setTimeout(() => this.closePasswordModal(), 1500);
      },
      error: (err) => {
        this.pwdLoading.set(false);
        const msg =
          err?.error?.current_password ||
          err?.error?.new_password?.[0] ||
          err?.error?.detail ||
          'Une erreur est survenue.';
        this.pwdError.set(msg);
      },
    });
  }
}
