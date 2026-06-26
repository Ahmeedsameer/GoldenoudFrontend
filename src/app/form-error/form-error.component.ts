import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-form-error',
  standalone: true, 
  template: `
    @if (errorMessage) {
      <small
        class="block mt-1 text-xs font-medium"
        style="color: #DC2626; font-family: 'Inter', system-ui, sans-serif;"
      >{{ errorMessage }}</small>
    }
  `
})
export class FormErrorComponent {
 
  @Input() control!: AbstractControl | null;


  get errorMessage(): string | null {
   
    if (!this.control || !this.control.invalid) return null;

 
    if (this.control.hasError('serverError')) {
      return this.control.getError('serverError');
    }

   
    if (this.control.touched || this.control.dirty) {
      if (this.control.hasError('required')) return 'هذا الحقل مطلوب.';
      if (this.control.hasError('email')) return 'صيغة البريد الإلكتروني غير صحيحة.';
      if (this.control.hasError('mismatch')) return 'كلمات المرور غير متطابقة.';
      
      if (this.control.hasError('minlength')) {
        const requiredLength = this.control.getError('minlength').requiredLength;
        return `يجب أن يكون ${requiredLength} أحرف على الأقل.`;
      }
    }
    
    return null;
  }
}