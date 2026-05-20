import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { AuthenticatedTopbar } from '../authenticated-topbar/authenticated-topbar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [RouterOutlet, Sidebar, AuthenticatedTopbar, CommonModule],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css',
})
export class AppLayout {
  isSidebarCollapsed = false;

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
