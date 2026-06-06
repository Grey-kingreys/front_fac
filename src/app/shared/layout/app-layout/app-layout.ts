import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { AuthenticatedTopbar } from '../authenticated-topbar/authenticated-topbar';
import { Toast } from '../../ui-kit/toast/toast';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, AuthenticatedTopbar, Toast],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css',
})
export class AppLayout {
  sidebarCollapsed = signal(false);

  onSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed.set(collapsed);
  }
}
