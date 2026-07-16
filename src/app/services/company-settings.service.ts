import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { BehaviorSubject, catchError, of, tap } from 'rxjs';

const API_BASE = 'http://localhost:8000/api';

export interface CompanySettings {
  id: number;
  name: string;
  logo_path: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
}

const DEFAULTS: CompanySettings = {
  id: 0,
  name: 'Alpha Business',
  logo_path: null,
  logo_url: null,
  email: null,
  phone: null,
  address: null,
  website: null,
  description: null,
};

@Injectable({
  providedIn: 'root',
})
export class CompanySettingsService {
  private httpClient: HttpClient = inject(HttpClient);
  private titleService = inject(Title);
  private apiUrl = `${API_BASE}/company-settings`;

  private settingsSubject = new BehaviorSubject<CompanySettings>(DEFAULTS);
  settings$ = this.settingsSubject.asObservable();

  get current(): CompanySettings {
    return this.settingsSubject.getValue();
  }

  /** Fetched once at app bootstrap (see app.config.ts) and after every admin save. */
  refresh() {
    return this.httpClient.get<{ data: CompanySettings }>(this.apiUrl).pipe(
      tap((res) => this.apply(res.data)),
      catchError(() => {
        // Backend unreachable at boot time — keep the fallback defaults so the
        // app still renders instead of blocking startup.
        return of(null);
      })
    );
  }

  updateSettings(payload: FormData) {
    return this.httpClient.post<{ data: CompanySettings }>(this.apiUrl, payload).pipe(
      tap((res) => this.apply(res.data))
    );
  }

  private apply(settings: CompanySettings) {
    this.settingsSubject.next(settings);
    this.titleService.setTitle(`${settings.name} — لوحة التحكم`);

    if (settings.logo_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.logo_url;
    }
  }
}
