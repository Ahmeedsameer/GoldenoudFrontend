import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-checkbox',
  imports: [CommonModule],
  template: `
    <label
      class="lux-checkbox-wrap"
      [ngClass]="{ 'opacity-50 cursor-not-allowed': disabled }"
    >
      <!-- Hidden native input -->
      <input
        [id]="id"
        type="checkbox"
        class="sr-only"
        [ngClass]="className"
        [checked]="checked"
        (change)="onChange($event)"
        [disabled]="disabled"
      />

      <!-- Custom checkbox box -->
      <span
        class="lux-checkbox-box"
        [style.background]="checked ? 'linear-gradient(135deg, #9c7820 0%, #c9a84c 40%, #e8c76d 100%)' : 'transparent'"
        [style.border-color]="checked ? 'transparent' : 'rgba(201,168,76,0.30)'"
      >
        @if (checked) {
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="#0c0900" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        }
      </span>

      @if (label) {
        <span class="lux-checkbox-label">{{ label }}</span>
      }
    </label>
  `,
  styles: ``
})
export class CheckboxComponent {

  @Input() label?: string;
  @Input() checked = false;
  @Input() className = '';
  @Input() id?: string;
  @Input() disabled = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  onChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.checkedChange.emit(input.checked);
  }
}
