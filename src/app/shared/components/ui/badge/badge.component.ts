import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';

type BadgeVariant = 'light' | 'solid';
type BadgeSize = 'sm' | 'md';
type BadgeColor = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark';

@Component({
  selector: 'app-badge',
  imports: [CommonModule,SafeHtmlPipe],
  templateUrl: './badge.component.html',
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'light';
  @Input() size: BadgeSize = 'md';
  @Input() color: BadgeColor = 'primary';
  @Input() startIcon?: string; // SVG or HTML string
  @Input() endIcon?: string;   // SVG or HTML string

  @HostBinding('class') get hostClasses(): string {
    // return `${this.baseStyles} ${this.sizeClass} ${this.colorStyles}`;
    return `flex`;
  }

  get baseStyles() {
    return 'lux-badge';
  }

  get sizeClass() {
    return this.size === 'sm' ? 'lux-badge-sm' : 'lux-badge-md';
  }

  get colorStyles() {
    const colorMap: Record<BadgeColor, string> = {
      primary: this.variant === 'solid' ? 'lux-badge-solid-primary' : 'lux-badge-primary',
      success: this.variant === 'solid' ? 'lux-badge-solid-success' : 'lux-badge-success',
      error:   this.variant === 'solid' ? 'lux-badge-solid-error'   : 'lux-badge-error',
      warning: this.variant === 'solid' ? 'lux-badge-solid-warning' : 'lux-badge-warning',
      info:    this.variant === 'solid' ? 'lux-badge-solid-info'    : 'lux-badge-info',
      light:   this.variant === 'solid' ? 'lux-badge-solid-light'   : 'lux-badge-light',
      dark:    this.variant === 'solid' ? 'lux-badge-solid-dark'    : 'lux-badge-dark',
    };
    return colorMap[this.color];
  }
}