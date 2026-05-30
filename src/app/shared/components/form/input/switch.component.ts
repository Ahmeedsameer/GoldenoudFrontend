import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

@Component({
  selector: 'app-switch',
  imports: [
    CommonModule
  ],
  template: `
    <label
      class="flex cursor-pointer select-none items-center gap-3"
      [ngClass]="{ 'opacity-50 cursor-not-allowed': disabled }"
      (click)="handleToggle()"
    >
      <!-- Track -->
      <div
        class="lux-switch-track"
        [style.background]="isChecked
          ? 'linear-gradient(135deg, #9c7820 0%, #c9a84c 50%, #e8c76d 100%)'
          : 'rgba(255,255,255,0.08)'"
        [style.border-color]="isChecked ? 'transparent' : 'rgba(201,168,76,0.18)'"
      >
        <!-- Knob -->
        <div
          class="lux-switch-knob"
          [style.background]="isChecked ? '#0c0900' : 'rgba(255,255,255,0.55)'"
          [style.transform]="isChecked ? 'translateX(22px)' : 'translateX(2px)'"
        ></div>
      </div>

      @if (label) {
        <span class="lux-switch-label">{{ label }}</span>
      }
    </label>
  `
})
export class SwitchComponent {

  @Input() label!: string;
  @Input() defaultChecked: boolean = false;
  @Input() disabled: boolean = false;
  @Input() color: 'blue' | 'gray' = 'blue';

  @Output() valueChange = new EventEmitter<boolean>();

  isChecked: boolean = false;

  ngOnInit() {
    this.isChecked = this.defaultChecked;
  }

  handleToggle() {
    if (this.disabled) return;
    this.isChecked = !this.isChecked;
    this.valueChange.emit(this.isChecked);
  }

}
