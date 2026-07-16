
import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import flatpickr from 'flatpickr';
import { Arabic } from 'flatpickr/dist/l10n/ar.js';
import { LabelComponent } from '../label/label.component';
import "flatpickr/dist/flatpickr.css";

/**
 * Visual calendar date picker (day/month/year chosen by click, never typed).
 * Drop-in replacement for `<input type="date">` with the same
 * [value]/(valueChange) shape used by app-time-picker, so it binds directly
 * to a reactive-form control: [value]="form.get('x')?.value"
 * (valueChange)="form.get('x')?.setValue($event)".
 */
@Component({
  selector: 'app-date-picker',
  imports: [LabelComponent],
  templateUrl: './date-picker.component.html',
  styles: ``
})
export class DatePickerComponent implements OnChanges {

  @Input() id!: string;
  @Input() mode: 'single' | 'multiple' | 'range' | 'time' = 'single';
  /** Current value as an ISO date string ('Y-m-d'), kept in sync with the form control. */
  @Input() value?: string | Date | null;
  @Input() label?: string;
  @Input() placeholder: string = 'اختر التاريخ';
  @Input() minDate?: string | Date;
  @Input() maxDate?: string | Date;
  /** Emits the picked date as 'Y-m-d' (or '' when cleared). */
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('dateInput', { static: false }) dateInput!: ElementRef<HTMLInputElement>;

  private flatpickrInstance: flatpickr.Instance | undefined;

  ngAfterViewInit() {
    this.flatpickrInstance = flatpickr(this.dateInput.nativeElement, {
      mode: this.mode,
      static: true,
      allowInput: false,          // calendar picking only — no manual typing
      monthSelectorType: 'static',
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd/m/Y',         // human-friendly display, still ISO underneath
      locale: Arabic,
      defaultDate: this.value ?? undefined,
      minDate: this.minDate,
      maxDate: this.maxDate,
      onChange: (_selectedDates, dateStr) => {
        this.valueChange.emit(dateStr);
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.flatpickrInstance) return;
    if (changes['value']) {
      const v = this.value;
      this.flatpickrInstance.setDate(v ?? '', false);
    }
    if (changes['minDate']) this.flatpickrInstance.set('minDate', this.minDate);
    if (changes['maxDate']) this.flatpickrInstance.set('maxDate', this.maxDate);
  }

  ngOnDestroy() {
    if (this.flatpickrInstance) {
      this.flatpickrInstance.destroy();
    }
  }
}
