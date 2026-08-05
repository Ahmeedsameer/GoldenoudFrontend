import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LabelComponent } from '../form/label/label.component';

export interface CustomerFormModel {
  name: string;
  phone: string;
  email: string;
  address: string;
}

/**
 * The one customer form (name/phone/email/address) — used for both the
 * cashier's "quick-add customer" flow and Customer Details' "Edit Customer"
 * action, so the fields/validation/markup exist in exactly one place.
 */
@Component({
  selector: 'app-customer-form',
  imports: [CommonModule, FormsModule, LabelComponent],
  templateUrl: './customer-form.component.html',
})
export class CustomerFormComponent {
  @Input() model: CustomerFormModel = { name: '', phone: '', email: '', address: '' };
  @Output() modelChange = new EventEmitter<CustomerFormModel>();

  @Input() loading = false;
  @Input() error = '';
  @Input() submitLabel = 'حفظ';
  @Input() showPhone = true;

  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  update<K extends keyof CustomerFormModel>(field: K, value: string) {
    this.model = { ...this.model, [field]: value };
    this.modelChange.emit(this.model);
  }
}
