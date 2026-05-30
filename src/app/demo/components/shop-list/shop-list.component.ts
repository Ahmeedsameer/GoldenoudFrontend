import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ComponentCardComponent } from '../../../shared/components/common/component-card/component-card.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { LabelComponent } from '../../../shared/components/form/label/label.component';
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { DEMO_SHOPS, PerfumeShop } from '../../models/demo-data';

@Component({
  selector: 'app-shop-list',
  standalone: true,
  imports: [
    CommonModule,
    ComponentCardComponent,
    ButtonComponent,
    LabelComponent,
    InputFieldComponent
  ],
  templateUrl: './shop-list.component.html',
 
})
export class ShopListComponent {
  shops: PerfumeShop[] = DEMO_SHOPS;
  searchTerm: string = '';

  constructor(private router: Router) {}

  get filteredShops(): PerfumeShop[] {
    if (!this.searchTerm) {
      return this.shops;
    }
    return this.shops.filter(shop =>
      shop.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      shop.address.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      shop.managerName.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  onSearchChange(value: string | number) {
    this.searchTerm = String(value);
  }

  onEnterShop(shop: PerfumeShop) {
    console.log('Entering shop:', shop.name);
    this.router.navigate(['/demo/dashboard/1']);
  }
}