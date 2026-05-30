import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-input-field',
  imports: [CommonModule],
  template: `
    <div class="relative">
      <input
        [type]="type"
        [id]="id"
        [name]="name"
        [placeholder]="placeholder"
        [value]="value"
        [min]="min"
        [max]="max"
        [step]="step"
        [disabled]="disabled"
        [ngClass]="inputClasses"
        (input)="onInput($event)"
      />
      @if (hint) {
        <p [ngClass]="hintClasses">{{ hint }}</p>
      }
    </div>
  `,
})
export class InputFieldComponent {

  @Input() type: string = 'text';
  @Input() id?: string = '';
  @Input() name?: string = '';
  @Input() placeholder?: string = '';
  @Input() value: string | number = '';
  @Input() min?: string;
  @Input() max?: string;
  @Input() step?: number;
  @Input() disabled: boolean = false;
  @Input() success: boolean = false;
  @Input() error: boolean = false;
  @Input() hint?: string;
  @Input() className: string = '';

  @Output() valueChange = new EventEmitter<string | number>();

  get inputClasses(): string {
    let base = `lux-input ${this.className}`;
    if (this.disabled) {
      base += ' opacity-40 cursor-not-allowed';
    } else if (this.error) {
      base += ' lux-input-error';
    } else if (this.success) {
      base += ' lux-input-success';
    }
    return base;
  }

  get hintClasses(): string {
    if (this.error)   return 'lux-hint lux-hint-error';
    if (this.success) return 'lux-hint lux-hint-success';
    return 'lux-hint';
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.valueChange.emit(this.type === 'number' ? +input.value : input.value);
  }
}
