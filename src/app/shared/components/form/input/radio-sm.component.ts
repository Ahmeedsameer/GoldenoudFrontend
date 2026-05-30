import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-radio-sm',
  imports: [CommonModule],
  template: `
    <label
      [attr.for]="id"
      [ngClass]="['flex cursor-pointer select-none items-center gap-2', className].join(' ')"
    >
      <input
        type="radio"
        [id]="id"
        [name]="name"
        [value]="value"
        [checked]="checked"
        (change)="onChange()"
        class="sr-only"
      />

      <!-- Small radio circle -->
      <span
        class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all duration-150"
        [style.border]="checked ? '1.5px solid #C9A84C' : '1.5px solid rgba(201,168,76,0.28)'"
        [style.background]="checked ? 'rgba(201,168,76,0.10)' : 'transparent'"
      >
        <span
          class="h-1.5 w-1.5 rounded-full transition-all duration-150"
          [style.background]="checked ? '#E8D26D' : 'transparent'"
        ></span>
      </span>

      <span class="text-xs font-medium" style="color: rgba(255,255,255,0.55);">{{ label }}</span>
    </label>
  `,
  styles: ``
})
export class RadioSmComponent {

  @Input() id!: string;
  @Input() name!: string;
  @Input() value!: string;
  @Input() checked: boolean = false;
  @Input() label!: string;
  @Input() className: string = '';

  @Output() valueChange = new EventEmitter<string>();

  onChange() {
    this.valueChange.emit(this.value);
  }
}
