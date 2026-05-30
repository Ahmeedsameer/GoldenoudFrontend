
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-file-input',
  imports: [],
  template: `
    <input
      type="file"
      [class]="'lux-file-input ' + className"
      (change)="onChange($event)"
    />
  `,
  styles: ``
})
export class FileInputComponent {

  @Input() className: string = '';
  @Output() change = new EventEmitter<Event>();

  onChange(event: Event) {
    this.change.emit(event);
  }
}
