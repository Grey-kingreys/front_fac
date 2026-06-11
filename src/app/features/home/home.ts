import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Topbar } from '../../shared/layout/topbar/topbar';
import { Footer } from '../../shared/layout/footer/footer';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, Topbar, Footer],
  templateUrl: './home.html',
})
export class Home {
  private authService = inject(AuthService);
  readonly isLoggedIn = this.authService.isLoggedIn;
}
