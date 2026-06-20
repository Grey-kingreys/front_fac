// ============================================================
// CHART CARD — Conteneur réutilisable pour les graphiques
// Chemin : src/app/shared/ui-kit/chart-card/chart-card.ts
//
// Wrapper visuel homogène (titre + sous-titre + contenu projeté)
// utilisé par tous les dashboards pour héberger un graphique
// ngx-charts. Style aligné sur les cartes existantes
// (bg-white rounded-2xl shadow-sm border border-gray-100).
// ============================================================
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chart-card',
  standalone: true,
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 h-full flex flex-col">
      <div class="flex items-start justify-between mb-4">
        <div class="min-w-0">
          <h3 class="text-base font-bold text-gray-900 truncate">{{ title }}</h3>
          @if (subtitle) {
            <p class="text-xs text-gray-400 mt-0.5">{{ subtitle }}</p>
          }
        </div>
        @if (badge) {
          <span class="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                [class]="badgeClass">{{ badge }}</span>
        }
      </div>
      <div class="flex-1 min-h-0">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class ChartCard {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() badge?: string;
  /** Classes Tailwind pour le badge (couleur). */
  @Input() badgeClass = 'text-blue-600 bg-blue-50';
}
