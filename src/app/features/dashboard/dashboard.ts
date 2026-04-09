import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Topbar } from '../../shared/layout/topbar/topbar';
import { Footer } from '../../shared/layout/footer/footer';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, Topbar, Footer],
  templateUrl: './dashboard.html',
})
export class Dashboard { }