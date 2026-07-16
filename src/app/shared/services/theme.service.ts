import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type Theme = 'light';

/**
 * Dark mode has been removed from the application — this service now only
 * ever enforces light mode, and strips any stale 'dark' class/localStorage
 * value left over from before removal so returning users aren't stuck dark.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeSubject = new BehaviorSubject<Theme>('light');
  theme$ = this.themeSubject.asObservable();

  constructor() {
    localStorage.removeItem('theme');
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark:bg-gray-900');
  }
}
