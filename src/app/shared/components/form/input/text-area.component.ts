import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';


@Component({
  selector: 'app-text-area',
  imports: [CommonModule],
  template: `
    <div class="relative">
      <textarea
        [placeholder]="placeholder"
        [rows]="rows"
        [value]="value"
        (input)="onInput($event)"
        [disabled]="disabled"
        [ngClass]="textareaClasses"
      ></textarea>
      @if (hint) {
        <p [ngClass]="error ? 'lux-hint lux-hint-error' : 'lux-hint'">{{ hint }}</p>
      }
    </div>
  `,
  styles: ``
})
export class TextAreaComponent {

  @Input() placeholder = 'Enter your message';
  @Input() rows = 3;
  @Input() value = '';
  @Input() className = '';
  @Input() disabled = false;
  @Input() error = false;
  @Input() hint = '';

  @Output() valueChange = new EventEmitter<string>();

  onInput(event: Event) {
    const val = (event.target as HTMLTextAreaElement).value;
    this.valueChange.emit(val);
  }

  get textareaClasses(): string {
    let base = `lux-textarea ${this.className}`;
    if (this.disabled) {
      base += ' opacity-40 cursor-not-allowed';
    } else if (this.error) {
      base += ' lux-input-error';
    }
    return base;
  }
}
