import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridShapeComponent } from '../../../shared/components/common/grid-shape/grid-shape.component';
import { Router, RouterModule } from '@angular/router';
import { CompanySettingsService } from '../../../services/company-settings.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-not-found',
  imports: [
    CommonModule,
    GridShapeComponent,
    RouterModule,
  ],
  templateUrl: './not-found.component.html',
  styles: ``
})
export class NotFoundComponent {
  companySettings = inject(CompanySettingsService);
  company$ = this.companySettings.settings$;

  private authService = inject(AuthService);
  private router = inject(Router);

  currentYear: number = new Date().getFullYear();

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  goHome(): void {
    this.router.navigateByUrl(this.isAuthenticated ? '/dashboard' : '/signin');
  }
}
