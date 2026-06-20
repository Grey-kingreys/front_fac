import { Component, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { AuthenticatedTopbar } from '../authenticated-topbar/authenticated-topbar';
import { Toast } from '../../ui-kit/toast/toast';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [NgClass, RouterOutlet, Sidebar, AuthenticatedTopbar, Toast],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css',
})
export class AppLayout {
  /** Repli desktop de la sidebar (280 ↔ 72px). */
  sidebarCollapsed = signal(false);
  /** Ouverture du drawer sur mobile (< lg). */
  mobileSidebarOpen = signal(false);

  onSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed.set(collapsed);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update(v => !v);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }
}
