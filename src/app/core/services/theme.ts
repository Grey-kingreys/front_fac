// ============================================================
// THEME SERVICE — Thème clair/sombre global et persistant
// Chemin : src/app/core/services/theme.ts
//
// Fonctionnement :
//   - L'état est un signal global (singleton, providedIn: 'root')
//   - Au changement, on ajoute/retire la classe `dark` sur <html>,
//     ce qui active les variantes Tailwind `dark:` dans toute l'app
//   - La préférence est sauvegardée dans localStorage et relue au
//     démarrage (sinon on respecte la préférence système du navigateur)
// ============================================================
import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'djoulagest-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _isDark = signal<boolean>(this.readInitialPreference());
  readonly isDark = this._isDark.asReadonly();

  constructor() {
    this.applyToDocument(this._isDark());
  }

  private readInitialPreference(): boolean {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    // Pas de préférence enregistrée → on suit la préférence système
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  private applyToDocument(isDark: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', isDark);
  }

  toggle(): void {
    this._isDark.update(v => !v);
    this.applyToDocument(this._isDark());
    window.localStorage.setItem(STORAGE_KEY, this._isDark() ? 'dark' : 'light');
  }

  setDark(isDark: boolean): void {
    this._isDark.set(isDark);
    this.applyToDocument(isDark);
    window.localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
  }
}