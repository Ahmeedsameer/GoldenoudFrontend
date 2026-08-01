import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserMetaCardComponent } from "../../../shared/components/user-profile/user-meta-card/user-meta-card.component";
import { UserManagmentService } from '../../../services/user-managment.service';
import { AuthService } from '../../../services/auth.service';
import { AlertState, FormHelperService } from '../../../services/form-helper.service';
import { User } from '../../../models/User.model';
import { LoadingComponent } from "../../../loading/loading.component";
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { FormErrorComponent } from '../../../form-error/form-error.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-single-user',
  imports: [CommonModule, ReactiveFormsModule, UserMetaCardComponent, LoadingComponent, AlertComponent, FormErrorComponent],
  templateUrl: './single-user.component.html',
  styleUrl: './single-user.component.css',
})
export class SingleUserComponent implements OnInit {

  user: User | null = null;
  loading = false;
  editMode = false;

  profileForm: FormGroup;
  profileAlert: AlertState = { show: false, type: '', message: '' };
  savingProfile = false;

  passwordForm: FormGroup;
  passwordAlert: AlertState = { show: false, type: '', message: '' };
  savingPassword = false;

  private userManagmentService: UserManagmentService = inject(UserManagmentService);
  private authService = inject(AuthService);
  private formHelperService = inject(FormHelperService);
  private fb = inject(FormBuilder);
  private route: ActivatedRoute = inject(ActivatedRoute);

  constructor() {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
    });

    this.passwordForm = this.fb.group({
      new_password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(16)]],
      new_password_confirmation: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    const userId = Number(this.route.snapshot.paramMap.get('id'));
    if (userId) {
      this.loadUser(userId);
    }
  }

  /** True only when viewing the AUTHENTICATED user's own record. */
  get isOwnProfile(): boolean {
    return !!this.user && this.user.id === this.authService.getUser()?.id;
  }

  loadUser(userId: number) {
    this.loading = true;
    this.userManagmentService.getUserById(userId).subscribe({
      next: (response) => {
        this.user = response;
        this.profileForm.patchValue({ name: response.name, email: response.email, phone: response.phone });
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  private passwordMatchValidator(control: AbstractControl) {
    const pw = control.get('new_password')?.value;
    const confirm = control.get('new_password_confirmation')?.value;
    return pw === confirm ? null : { mismatch: true };
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    this.profileAlert = { show: false, type: '', message: '' };
    if (this.user) {
      this.profileForm.patchValue({ name: this.user.name, email: this.user.email, phone: this.user.phone });
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile = true;
    this.profileAlert = { show: false, type: '', message: '' };
    this.userManagmentService.updateOwnProfile(this.profileForm.value).subscribe({
      next: (res) => {
        this.savingProfile = false;
        this.profileAlert = this.formHelperService.showSuccess('تم تحديث الملف الشخصي بنجاح');
        this.editMode = false;
        if (this.user) {
          this.user = { ...this.user, ...res.user };
        }
      },
      error: (err) => {
        this.savingProfile = false;
        this.profileAlert = this.formHelperService.handleBackendErrors(err, this.profileForm);
      }
    });
  }

  savePassword() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword = true;
    this.passwordAlert = { show: false, type: '', message: '' };

    const payload = {
      new_password: this.passwordForm.value.new_password,
      new_password_confirmation: this.passwordForm.value.new_password_confirmation,
    };

    const request$ = this.isOwnProfile
      ? this.userManagmentService.changeOwnPassword(payload)
      : this.userManagmentService.resetUserPassword(this.user!.id!, payload);

    request$.subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordAlert = this.formHelperService.showSuccess(
          this.isOwnProfile ? 'تم تغيير كلمة المرور بنجاح' : 'تم إعادة تعيين كلمة المرور بنجاح'
        );
        this.passwordForm.reset();
      },
      error: (err) => {
        this.savingPassword = false;
        this.passwordAlert = this.formHelperService.handleBackendErrors(err, this.passwordForm);
      }
    });
  }
}
