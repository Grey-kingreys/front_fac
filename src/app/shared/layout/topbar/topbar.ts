import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './topbar.html',
  animations: [
    trigger('slideDown', [
      state('void', style({
        height: '0',
        opacity: '0',
        overflow: 'hidden'
      })),
      state('*', style({
        height: '*',
        opacity: '1',
        overflow: 'visible'
      })),
      transition('void <=> *', [
        animate('300ms ease-out')
      ])
    ])
  ]
})
export class Topbar {
  isMobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }
}