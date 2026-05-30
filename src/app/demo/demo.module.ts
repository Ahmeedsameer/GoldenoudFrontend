import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { DemoRoutingModule } from './demo-routing.module';
import { ShopListComponent } from './components/shop-list/shop-list.component';
import { FakeLoginComponent } from './components/fake-login/fake-login.component';

@NgModule({
  declarations: [
    ShopListComponent,
    FakeLoginComponent
  ],
  imports: [
    CommonModule,
    DemoRoutingModule
  ]
})
export class DemoModule { }