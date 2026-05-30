import { Component, inject } from '@angular/core';
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { ComponentCardComponent } from '../../../shared/components/common/component-card/component-card.component';
import { LabelComponent } from '../../../shared/components/form/label/label.component';
import { Option, SelectComponent } from '../../../shared/components/form/select/select.component';
import { SelectInputsComponent } from "../../../shared/components/form/form-elements/select-inputs/select-inputs.component";
import { ButtonComponent } from "../../../shared/components/ui/button/button.component";
import { User } from '../../../models/User.model';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserManagmentService } from '../../../services/user-managment.service';
import { AlertState, FormHelperService } from '../../../services/form-helper.service';
import { FormErrorComponent } from '../../../form-error/form-error.component';
import { TimePickerComponent } from "../../../shared/components/form/time-picker/time-picker.component";

@Component({
  selector: 'app-create-new-user',
  imports: [ComponentCardComponent, InputFieldComponent, LabelComponent, SelectComponent, ButtonComponent, LoadingComponent, AlertComponent, ReactiveFormsModule, FormErrorComponent, TimePickerComponent],
  templateUrl: './create-new-user.component.html',
  styleUrl: './create-new-user.component.css',
})
export class CreateNewUserComponent {
  private fb = inject(FormBuilder);
  private userManagmentService:UserManagmentService = inject(UserManagmentService);
  private formHelperService = inject(FormHelperService);
  alert: AlertState = { show: false, type: 'success', message: '' };
  userForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [ Validators.pattern(/^01\d{9}$/)]],
    shift_start: ['', [Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]], // صيغة الوقت HH:mm
    shift_end: ['',[ Validators.pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)]], // صيغة الوقت HH:mm
    role: ['',[ Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    coPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator }); // فاليديشن تطابق الباسورد
  loading:boolean = false;
 
  userTypes : Option[] = [
    { value: 'admin', label: 'مدير موقع' },
    { value: 'sales', label: 'بائع' },
    { value: 'manager', label: 'مدير فرع' },
    
  ]



  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password')?.value;
    const coPassword = control.get('coPassword')?.value;
    return password === coPassword ? null : { mismatch: true };
  }

  onSubmit() {
    this.loading = true;
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched(); 
      this.loading = false;
      return;
    }
    this.userManagmentService.createUser(this.userForm.value).subscribe(
     { 
      next:(Response)=>{
        console.log(Response);
        this.alert = this.formHelperService.showSuccess('تم إنشاء المستخدم بنجاح!');
        this.userForm.reset();
        this.loading = false;
      },
      error:(err)=> {
        console.log(err);
        this.alert = this.formHelperService.handleBackendErrors(err, this.userForm);
        this.loading = false;
    }
  }
    )

  }
}
