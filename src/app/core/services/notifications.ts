// ============================================================
// NOTIFICATIONS SERVICE — Centre de notifications in-app
// Chemin : src/app/core/services/notifications.ts
//
// Backend réel (apps/notifications/) :
//   GET  /api/notifications/                liste (paginée)
//   GET  /api/notifications/?non_lues=true  uniquement les non lues
//   POST /api/notifications/{id}/lire/      marquer une notification comme lue
//   POST /api/notifications/tout-lire/      tout marquer comme lu
// ============================================================
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type NotificationType =
  | 'rupture_stock' | 'seuil_stock' | 'ecart_caisse' | 'mission_litige'
  | 'taux_change_expire' | 'echeance_client' | 'transfert_valide'
  | 'conge_approuve' | 'maintenance_vehicule' | 'commande_fournisseur' | 'info';

export interface AppNotification {
  id: number;
  type_notification: NotificationType;
  type_label: string;
  titre: string;
  message: string;
  lien: string;
  est_lue: boolean;
  created_at: string;
}

export interface PaginatedNotifications {
  count: number;
  results: AppNotification[];
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private readonly BASE = `${environment.apiUrl}/notifications`;

  // État partagé : liste + compteur de non-lues, consommé par la topbar
  private _notifications = signal<AppNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  readonly unreadCount = computed(() =>
    this._notifications().filter(n => !n.est_lue).length
  );

  loading = signal(false);

  // Charge les notifications les plus récentes (toutes, lues + non lues,
  // pour afficher un historique court dans le panneau)
  load(pageSize = 20): void {
    this.loading.set(true);
    this.http.get<PaginatedNotifications>(`${this.BASE}/?page_size=${pageSize}`).subscribe({
      next: (res) => { this._notifications.set(res.results); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  markAsRead(id: number): void {
    this.http.post<AppNotification>(`${this.BASE}/${id}/lire/`, {}).subscribe({
      next: (updated) => {
        this._notifications.update(list =>
          list.map(n => (n.id === id ? updated : n))
        );
      },
      error: () => {},
    });
  }

  markAllAsRead(): void {
    this.http.post<{ detail: string }>(`${this.BASE}/tout-lire/`, {}).subscribe({
      next: () => {
        this._notifications.update(list => list.map(n => ({ ...n, est_lue: true })));
      },
      error: () => {},
    });
  }

  // Icône/couleur selon le type — utilisé par le panneau notifications
  getIconType(type: NotificationType): 'warning' | 'danger' | 'success' | 'info' {
    const danger: NotificationType[] = ['rupture_stock', 'ecart_caisse', 'mission_litige'];
    const warning: NotificationType[] = ['seuil_stock', 'taux_change_expire', 'echeance_client', 'maintenance_vehicule'];
    const success: NotificationType[] = ['transfert_valide', 'conge_approuve'];
    if (danger.includes(type)) return 'danger';
    if (warning.includes(type)) return 'warning';
    if (success.includes(type)) return 'success';
    return 'info';
  }
}