import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComponentCardComponent } from '../../../shared/components/common/component-card/component-card.component';
import { InputFieldComponent } from '../../../shared/components/form/input/input-field.component';
import { LabelComponent } from '../../../shared/components/form/label/label.component';
import { ButtonComponent } from '../../../shared/components/ui/button/button.component';
import { AlertComponent } from '../../../shared/components/ui/alert/alert.component';
import { LoadingComponent } from '../../../loading/loading.component';
import { AlertState, FormHelperService } from '../../../services/form-helper.service';
import { CompanySettingsService } from '../../../services/company-settings.service';

@Component({
  selector: 'app-company-settings',
  imports: [
    CommonModule,
    FormsModule,
    ComponentCardComponent,
    InputFieldComponent,
    LabelComponent,
    ButtonComponent,
    AlertComponent,
    LoadingComponent,
  ],
  templateUrl: './company-settings.component.html',
})
export class CompanySettingsComponent implements OnInit {
  private companySettings = inject(CompanySettingsService);
  private formHelperService = inject(FormHelperService);

  loading = false;
  alert: AlertState = { show: false, type: '', message: '' };

  form = {
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    description: '',
  };

  logoFile: File | null = null;
  logoPreview: string | null = null;
  currentLogoUrl: string | null = null;

  ngOnInit(): void {
    const c = this.companySettings.current;
    this.form = {
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      website: c.website || '',
      description: c.description || '',
    };
    this.currentLogoUrl = c.logo_url;
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.logoFile = file;

    if (file) {
      const reader = new FileReader();
      reader.onload = () => { this.logoPreview = reader.result as string; };
      reader.readAsDataURL(file);
    } else {
      this.logoPreview = null;
    }
  }

  save() {
    if (!this.form.name.trim()) {
      this.alert = { show: true, type: 'error', message: 'اسم الشركة مطلوب' };
      return;
    }

    this.loading = true;
    this.alert = { show: false, type: '', message: '' };

    const formData = this.formHelperService.createFormData(this.form, this.logoFile, 'logo');

    this.companySettings.updateSettings(formData).subscribe({
      next: () => {
        this.loading = false;
        this.logoFile = null;
        this.logoPreview = null;
        this.currentLogoUrl = this.companySettings.current.logo_url;
        this.alert = this.formHelperService.showSuccess('تم تحديث بيانات الشركة بنجاح');
      },
      error: (err) => {
        this.loading = false;
        const message = err?.error?.message || 'تعذّر حفظ بيانات الشركة';
        this.alert = { show: true, type: 'error', message };
      },
    });
  }
}
