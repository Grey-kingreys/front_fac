import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth';

@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRole implements OnInit {
  @Input('appHasRole') roles: string[] = [];

  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private authService = inject(AuthService);

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    const userRole = currentUser?.role ?? '';

    if (this.roles.includes(userRole)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}