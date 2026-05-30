import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const jwtInterceptorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  let newReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${authService.getAuthToken()}`,
      Accept: 'application/json',
    },
  });
  return next(newReq).pipe(
    catchError((error:HttpErrorResponse)=>{
      if ((error.status === 401 || error.status === 403) && authService.isTokenExpired()) {
       
      
        authService.logout(); 
        
      }

      
      return throwError(() => error);
    })
  );
};
