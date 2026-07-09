import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Highlights the matched search term inside a string by wrapping every
 * (case-insensitive) occurrence in <mark>. Reusable across every product
 * search dropdown (Supply, Transfer, Cashier, …).
 *
 * Usage: <span [innerHTML]="product.name | highlight: query"></span>
 */
@Pipe({ name: 'highlight', standalone: true })
export class HighlightPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(text: string | null | undefined, term: string | null | undefined): SafeHtml {
    const value = text ?? '';
    const q = (term ?? '').trim();

    // Always HTML-escape the source text first (prevents injection).
    const escaped = this.escape(value);
    if (!q) {
      return this.sanitizer.bypassSecurityTrustHtml(escaped);
    }

    const pattern = new RegExp(`(${this.escapeRegExp(q)})`, 'gi');
    const highlighted = escaped.replace(
      pattern,
      '<mark class="bg-brand-100 text-brand-800 dark:bg-brand-500/30 dark:text-brand-200 rounded px-0.5">$1</mark>',
    );
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }

  private escape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
