import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

/**
 * Hook pour accéder à l'état d'authentification
 * Équivalent à useAuth() en React/Next
 * 
 * Usage:
 * export class MyComponent {
 *   private { isLoggedIn, currentUser, logout } = useAuth();
 * }
 */
export function useAuth() {
  const authService = inject(AuthService);

  return {
    // Signal réactif - true si l'utilisateur est connecté
    isLoggedIn: authService.isLoggedIn,
    
    // Signal réactif - données de l'utilisateur connecté
    currentUser: authService.currentUser,
    
    // Méthode pour se déconnecter
    logout: () => authService.logout(),
    
    // Méthode pour obtenir le token d'accès
    getAccessToken: () => authService.getAccessToken(),
    
    // Méthode pour obtenir le token de rafraîchissement
    getRefreshToken: () => authService.getRefreshToken(),
    
    // Vérifier si un token valide existe
    hasValidToken: () => authService.hasValidToken(),
  };
}
