import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ModalComponent } from '../../../shared/components/ui/modal/modal.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { BadgeComponent } from '../../../shared/components/ui/badge/badge.component';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../shared/components/form/label/label.component';
import { FormErrorComponent } from '../../../form-error/form-error.component';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  sku: string;
  category: string;
}

@Component({
  selector: 'app-cashier-widget',
  standalone: true,
  imports: [
    CommonModule,
    ModalComponent,
    ButtonComponent,
    BadgeComponent,
    ReactiveFormsModule,
    InputFieldComponent,
    LabelComponent,
    FormErrorComponent
  ],
  templateUrl: './cashier-widget.component.html',
  styleUrl: './cashier-widget.component.css'
})
export class CashierWidgetComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  products: Product[] = [
    { id: 1, name: 'عطر مسك العنوان', price: 350, sku: 'MSK-001', category: 'عطورات' },
    { id: 2, name: 'عطر بيت العطور', price: 280, sku: 'Bait-001', category: 'عطورات' },
    { id: 3, name: 'عطر أول局长', price: 420, sku: 'Oud-001', category: 'عود' },
    { id: 4, name: 'عطر روز وود', price: 320, sku: 'Rose-001', category: 'عطورات' },
    { id: 5, name: 'عطر يمن', price: 380, sku: 'Yamen-001', category: 'عطورات' },
    { id: 6, name: 'عطر شذي', price: 290, sku: 'Shahi-001', category: 'عطورات' },
  ];

  cart: CartItem[] = [
    { id: 1, name: 'عطر مسك العنوان', price: 350, quantity: 2 },
    { id: 2, name: 'عطر روز وود', price: 320, quantity: 1 },
    { id: 3, name: 'عطر شذي', price: 290, quantity: 3 },
  ];

  searchTerm: string = '';
  showCheckoutModal = false;
  checkoutForm: FormGroup;

  constructor(private router: Router, private fb: FormBuilder) {
    this.checkoutForm = this.fb.group({
      customerName: [''],
      customerPhone: [''],
      paymentMethod: ['cash']
    });
  }

  get filteredProducts(): Product[] {
    if (!this.searchTerm) return this.products;
    return this.products.filter(p =>
      p.name.includes(this.searchTerm) ||
      p.sku.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  get cartTotal(): number {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  get cartCount(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  addToCart(product: Product) {
    const existing = this.cart.find(item => item.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      });
    }
  }

  removeFromCart(item: CartItem) {
    const index = this.cart.findIndex(i => i.id === item.id);
    if (index > -1) {
      this.cart.splice(index, 1);
    }
  }

  updateQuantity(item: CartItem, delta: number) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeFromCart(item);
    }
  }

  onSearchChange(value: string | number) {
    this.searchTerm = String(value);
  }

  onCheckout() {
    this.showCheckoutModal = true;
  }

  processPayment() {
    alert(`تم معالجة الدفع بقيمة ${this.cartTotal} ر.س`);
    this.cart = [];
    this.showCheckoutModal = false;
    this.closeModal();
  }

  closeModal() {
    this.close.emit();
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('ar-SA') + ' ر.س';
  }
}