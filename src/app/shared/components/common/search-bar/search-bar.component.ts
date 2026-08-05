import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';

/**
 * Reusable search input used across every list/table page in the ERP.
 * Emits the trimmed, lowercased search term after debouncing —
 * callers only ever see a normalized, deduplicated stream.
 */
@Component({
  selector: 'app-search-bar',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './search-bar.component.html',
  styles: ``,
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'بحث...';
  @Input() debounceMs = 300;
  /** Reset the input's displayed text (e.g. after a "clear filters" action elsewhere on the page). */
  @Input() set value(v: string) {
    this.control.setValue(v ?? '', { emitEvent: false });
  }

  @Output() searchChange = new EventEmitter<string>();

  control = new FormControl('', { nonNullable: true });
  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.control.valueChanges
      .pipe(
        debounceTime(this.debounceMs),
        map((v) => (v ?? '').trim().toLowerCase()),
        distinctUntilChanged(),
      )
      .subscribe((term) => this.searchChange.emit(term));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  clear(): void {
    this.control.setValue('');
  }
}
