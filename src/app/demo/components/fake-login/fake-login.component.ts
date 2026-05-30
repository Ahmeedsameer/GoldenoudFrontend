import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ComponentCardComponent } from '../../../shared/components/common/component-card/component-card.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { LabelComponent } from '../../../shared/components/form/label/label.component';
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { FormErrorComponent } from '../../../form-error/form-error.component';

@Component({
  selector: 'app-fake-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ComponentCardComponent,
    ButtonComponent,
    LabelComponent,
    InputFieldComponent,
    FormErrorComponent
  ],
  templateUrl: './fake-login.component.html',

})
export class FakeLoginComponent {
  shopId: number = 0;
  shopName: string = '';
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.shopId = this.route.snapshot.queryParams['shopId'] || 0;
    this.shopName = this.route.snapshot.queryParams['shopName'] || 'المحل';
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { username, password } = this.loginForm.value;
    
    // Fake authentication - demo only
    if (username === 'admin' && password === '1234') {
      console.log('Login successful for shop:', this.shopName);
      alert(`مرحباً ${username}! Successfully logged in to ${this.shopName}`);
      this.router.navigate(['/demo']);
    } else {
      this.errorMessage = 'اسم المستخدم أو كلمة المرور غير صحيحة';
      this.loginForm.reset();
    }
  }
}