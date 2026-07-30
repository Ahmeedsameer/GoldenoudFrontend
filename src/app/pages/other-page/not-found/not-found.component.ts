import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridShapeComponent } from '../../../shared/components/common/grid-shape/grid-shape.component';
import { RouterModule } from '@angular/router';
import { CompanySettingsService } from '../../../services/company-settings.service';

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

  currentYear: number = new Date().getFullYear();
}
