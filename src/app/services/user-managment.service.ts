import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, retry, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserManagmentService {
  private httpClient:HttpClient = inject(HttpClient);
  private apiUrl = 'http://localhost:8000/api/user-managment';


  public createUser(userData: any) {
    return this.httpClient.post<any>(`${this.apiUrl}/create`,userData).pipe(retry(2))
   
  }

  public getUsers(params:any) {
    return this.httpClient.get<any>(`${this.apiUrl}/list`,{params}).pipe(retry(2));
  }


  public getUserById(userId: number) {
    return this.httpClient.get<any>(`${this.apiUrl}/show/${userId}`).pipe(retry(2));
  }
}
