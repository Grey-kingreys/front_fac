import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spinner.html',
})
export class Spinner {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() message = '';
}