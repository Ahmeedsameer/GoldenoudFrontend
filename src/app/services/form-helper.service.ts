import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';


export interface AlertState {
  show: boolean;
  type: 'success' | 'error' | 'warning' | '';
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class FormHelperService {
  showSuccess(message: string): AlertState {
    return { show: true, type: 'success', message: message };
  }

 
  handleBackendErrors(err: HttpErrorResponse, form: FormGroup): AlertState {
    if (err.status === 422 && err.error?.errors) {
      const backendErrors = err.error.errors;
      
      Object.keys(backendErrors).forEach(field => {
        const formControl = form.get(field);
        console.log(`Processing backend error for field: ${field}, error: ${backendErrors[field][0]}`);
        
        if (formControl) {
          console.log(`Setting server error for field: ${field}, message: ${backendErrors[field][0]}`);
          
          formControl.setErrors({ serverError: backendErrors[field][0] });
          formControl.markAsTouched();
        }
      });
      
    
      return { show: true, type: 'error', message: 'يرجى مراجعة الأخطاء الموضحة بالنموذج.' };
    }
    
  
    return { show: true, type: 'error', message: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.' };
  }


createFormData(formValue: any, file?: File|null, fileKey: string | null = 'file'): FormData {
  const formData = new FormData();
  

  Object.keys(formValue).forEach(key => {
    const value = formValue[key];
    if (value !== null && value !== undefined && value !== '') {
      formData.append(key, value);
    }
  });
  
 
  if (file && fileKey) {
    formData.append(fileKey, file, file.name);
  }
  
  return formData;
}

 
}
