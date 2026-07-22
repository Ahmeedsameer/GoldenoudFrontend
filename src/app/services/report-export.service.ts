import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

const API_BASE = 'http://127.0.0.1:8000/api';

/**
 * The one place every report's Export/Print buttons go through — no report
 * writes its own download logic. Point it at a backend `.../export` endpoint
 * (format=pdf|excel) and it handles the blob download; `printUrl` opens the
 * PDF in a new tab so the browser's native print dialog can be used.
 */
@Injectable({ providedIn: 'root' })
export class ReportExportService {
  private http = inject(HttpClient);

  download(path: string, params: Record<string, any>, format: 'pdf' | 'excel', fileName: string): void {
    const cleaned: Record<string, any> = {};
    const merged: Record<string, any> = { ...params, format };
    Object.entries(merged).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });

    this.http.get(`${API_BASE}${path}`, { params: cleaned, responseType: 'blob' }).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  /** Opens the PDF in a new tab — the seller/admin uses the browser's own print dialog from there.
   *  The tab is opened SYNCHRONOUSLY (before the async request resolves) and only navigated once
   *  the blob is ready — opening it after an await/subscribe callback gets popup-blocked in most
   *  browsers, since it's no longer considered part of the original click gesture. */
  print(path: string, params: Record<string, any>): void {
    const win = window.open('', '_blank');

    const cleaned: Record<string, any> = {};
    const merged: Record<string, any> = { ...params, format: 'pdf' };
    Object.entries(merged).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cleaned[k] = v; });

    this.http.get(`${API_BASE}${path}`, { params: cleaned, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (win) {
          win.location.href = url;
          win.addEventListener('load', () => win.print());
        }
      },
      error: () => { win?.close(); },
    });
  }
}
