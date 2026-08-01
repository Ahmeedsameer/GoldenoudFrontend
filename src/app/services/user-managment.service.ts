import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, retry, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserManagmentService {
  private httpClient:HttpClient = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/user-managment`;


  public createUser(userData: any) {
    return this.httpClient.post<any>(`${this.apiUrl}/create`,userData).pipe(retry(2))
   
  }

  public getUsers(params:any) {
    return this.httpClient.get<any>(`${this.apiUrl}/list`,{params}).pipe(retry(2));
  }


  public getUserById(userId: number) {
    return this.httpClient.get<any>(`${this.apiUrl}/show/${userId}`).pipe(retry(2));
  }

  /** Always updates the AUTHENTICATED admin's own profile — no ID is ever sent. */
  public updateOwnProfile(data: { name: string; email: string; phone?: string | null }) {
    return this.httpClient.put<any>(`${this.apiUrl}/profile`, data);
  }

  /** Changes the AUTHENTICATED admin's own password. */
  public changeOwnPassword(data: { new_password: string; new_password_confirmation: string }) {
    return this.httpClient.put<any>(`${this.apiUrl}/change-password`, data);
  }

  /** Admin resets another user's password — new password only, never reads the old one. */
  public resetUserPassword(userId: number, data: { new_password: string; new_password_confirmation: string }) {
    return this.httpClient.put<any>(`${this.apiUrl}/${userId}/reset-password`, data);
  }
}
