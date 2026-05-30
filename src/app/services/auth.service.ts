import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, tap, throwError } from 'rxjs';


const AUTH_TOKEN = 'AUTH_TOKEN';
const ROLE = 'ROLE';
const USER = 'User';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private httpClient: HttpClient = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://localhost:8000/api/auth';
  private storage : Storage = sessionStorage;

  private userSubject : BehaviorSubject<any | null> = new BehaviorSubject<any | null>(this.getUser());
  private loggedInSubject = new BehaviorSubject<boolean>(this.isAuthenticated());

  user$ = this.userSubject.asObservable();
  isLoggedIn$ = this.loggedInSubject.asObservable();

  login(email: string, password: string) {
    const payload = { email, password };
    return this.httpClient.post<any>(`${this.apiUrl}/login`, payload).pipe(
      
      tap(response => {
        // Handle successful login, e.g., store token
        this.storage.setItem(AUTH_TOKEN, JSON.stringify(response.access_token));
        this.storage.setItem(ROLE, JSON.stringify(response.role));
        this.storage.setItem(USER, JSON.stringify(response.user));
        
        this.userSubject.next(response.user);
        this.loggedInSubject.next(true);

        // All roles land on /dashboard — the canMatch guards pick the right layout,
        // and the child redirect ('' → 'cashier') handles sellers automatically.
        this.router.navigate(['/dashboard']);
        
      }),
      catchError(error => {
        // Handle login error
        console.error('Login error:', error);
        return throwError(error);
        
      })
    );
  }

  getUser() {
    const strUser = this.storage.getItem(USER);
    return strUser ? JSON.parse(strUser) : null;
  }

  isAuthenticated(): boolean {
   console.log("isAuthenticated called, token expired:", this.isTokenExpired());
   
    return !(this.isTokenExpired()) ;
  }

  logout() {
    this.storage.removeItem(AUTH_TOKEN);
    this.storage.removeItem(ROLE);
    this.storage.removeItem(USER);

    this.userSubject.next(null);
    this.loggedInSubject.next(false);

    this.router.navigate(['/signin']);
  }

  getAuthToken(): string | null {
    const token = this.storage.getItem(AUTH_TOKEN);
    return token ? JSON.parse(token) : null;
  }

 
  isTokenExpired(): boolean {
    // Use getAuthToken() which applies JSON.parse, giving the real token string
    const token = this.getAuthToken();

    if (!token) {
      return true;
    }

    // Non-JWT (opaque) tokens have no dots — treat them as valid
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    try {
      const decodedPayload = JSON.parse(atob(parts[1]));

      // If there is no exp claim, the token never expires
      if (!decodedPayload.exp) {
        return false;
      }

      return Date.now() > decodedPayload.exp * 1000;
    } catch {
      // Unparseable payload — assume still valid so we don't lock out the user
      return false;
    }
  }

  getUserRole(): string | null {
    // Primary: from the dedicated ROLE storage key set at login
    const storedRole = this.storage.getItem(ROLE);
    if (storedRole) {
      try { return JSON.parse(storedRole); } catch { /* fall through */ }
    }
    // Fallback: from the user object (in case role is embedded there)
    return this.userSubject.getValue()?.role ?? null;
  }



  isAdmin(): boolean {
    const role = this.getUserRole();
    return role === 'admin';
  }

  isSupervisor(): boolean {
    const role = this.getUserRole();
    return role === 'supervisor';
  }

  isEmployee(): boolean {
    const role = this.getUserRole();
    return role === 'employee';
  }

  isSeller(): boolean {
    const role = this.getUserRole();
    return role === 'sales';
  }

  isManager(): boolean {
    const role = this.getUserRole();
    return role === 'manager';
  }

}
