import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxComponent } from '../shared/components/form/input/checkbox.component';
import { InputFieldComponent } from '../shared/components/form/input/input-field.component';
import { RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LoadingComponent } from '../loading/loading.component';
import { CommonModule } from '@angular/common';
import { CompanySettingsService } from '../services/company-settings.service';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule,
    CheckboxComponent,
    InputFieldComponent,
    RouterModule,
    LoadingComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  companySettings = inject(CompanySettingsService);
  company$ = this.companySettings.settings$;

  email: string = '';
  showPassword: boolean = false;
  password: string = '';
  isChecked: boolean = false;
  loading: boolean = false;

  errorMessage: string | null = null;
  successMessage: string | null = null;

  private authService: AuthService = inject(AuthService);
  // signForm = new FormGroup({
  //   email:new FormControl('',[
  //     Validators.required,
  //     Validators.email
  //   ]),

  //   password:new FormControl('',[
  //     Validators.required,
  //     Validators.minLength(8),
  //     Validators.maxLength(16)
  //   ]),
  //    keepLoggedIn: new FormControl(false)
  // })

  
  constructor() {
  
  }
  onSignIn(){
    console.log('Email:', this.email);
    console.log("password :", this.password);
    
    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'يرجى إدخال البريد الإلكتروني وكلمة المرور.';
      return;
    }
    this.loading = true;
    this.errorMessage = null;
    this.successMessage = null;

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        // Show a brief success message — the AuthService tap already navigated.
        this.loading = false;
        this.successMessage = 'تم تسجيل الدخول بنجاح! جارٍ التحويل...';
      },
      error: (error) => {
        this.loading = false;
        const status = error?.status;
        if (status === 401 || status === 422) {
          this.errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
        } else if (status === 0) {
          this.errorMessage = 'تعذّر الاتصال بالخادم. تأكد من تشغيل الخادم وحاول مجدداً.';
        } else {
          this.errorMessage = 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.';
        }
      }
    });
  }

  togglePasswordVisibility(){
    this.showPassword = !this.showPassword;
  }


  setEmail(value: string | number) {
    this.email = value.toString();
  }

  setPassword(value :string | number){
  this.password = value.toString();
  }

  setChecked(value: any){
    // this.isChecked = value;
    console.log(value);
    
  }
}
