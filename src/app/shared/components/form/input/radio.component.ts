import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';

@Component({
  selector: 'app-radio',
  imports: [
    CommonModule,
  ],
  template: `
    <label
      [attr.for]="id"
      [ngClass]="['flex cursor-pointer select-none items-center gap-3', disabled ? 'opacity-50 cursor-not-allowed' : '', className].join(' ')"
    >
      <input
        [id]="id"
        [name]="name"
        type="radio"
        [value]="value"
        [checked]="checked"
        (change)="onChange()"
        class="sr-only"
        [disabled]="disabled"
      />

      <!-- Custom radio circle -->
      <span
        class="lux-radio-outer"
        [style.border-color]="checked ? '#C9A84C' : 'rgba(201,168,76,0.28)'"
        [style.background]="checked ? 'rgba(201,168,76,0.10)' : 'transparent'"
      >
        <span
          class="lux-radio-inner"
          [style.background]="checked ? 'linear-gradient(135deg, #c9a84c 0%, #e8d26d 100%)' : 'transparent'"
          [style.opacity]="checked ? '1' : '0'"
        ></span>
      </span>

      <span class="lux-radio-label">{{ label }}</span>
    </label>
  `,
})
export class RadioComponent {

  @Input() id!: string;
  @Input() name!: string;
  @Input() value!: string;
  @Input() checked: boolean = false;
  @Input() label!: string;
  @Input() className: string = '';
  @Input() disabled: boolean = false;

  @Output() valueChange = new EventEmitter<string>();

  onChange() {
    if (!this.disabled) {
      this.valueChange.emit(this.value);
    }
  }
}
