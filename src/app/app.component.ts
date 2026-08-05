import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavigationHistoryService } from './services/navigation-history.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  // Forces NavigationHistoryService to be created here, at app bootstrap —
  // before the first route even activates — so it never misses a
  // navigation. providedIn: 'root' alone only creates it on first inject(),
  // which would be too late if nothing else needed it until a "Back" button
  // was clicked.
  private navigationHistory = inject(NavigationHistoryService);
}
