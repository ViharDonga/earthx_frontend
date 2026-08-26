import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export interface CurrentUser {
  id?: string;
  username: string;
  fullName: string;
  email: string;
  role: 'super-user' | 'user';
  roleLabel: string;
}

export interface AuthResponse {
  message: string;
  user: UserProfile;
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private readonly TOKEN_KEY = 'earthx_access_token';
  private readonly USER_KEY = 'earthx_user';

  currentUser = signal<CurrentUser>(this.getStoredUser());
  isAuthenticated = signal<boolean>(this.hasValidSession());
  isLoading = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Register a new user with NestJS backend
   */
  register(payload: RegisterPayload): Observable<AuthResponse> {
    this.isLoading.set(true);
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, payload).pipe(
      tap((res) => {
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Login with email and password to receive JWT token
   */
  login(payload: LoginPayload): Observable<AuthResponse> {
    this.isLoading.set(true);
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, payload).pipe(
      tap((res) => {
        this.handleAuthSuccess(res);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        return throwError(() => err);
      })
    );
  }

  /**
   * Fetch authenticated user's profile using JWT token
   */
  getProfile(): Observable<{ message: string; user: UserProfile }> {
    return this.http.get<{ message: string; user: UserProfile }>(`${this.apiUrl}/auth/profile`);
  }

  /**
   * Check if valid token exists in storage
   */
  hasValidSession(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    return !!token && token.length > 10;
  }

  /**
   * Get JWT Access Token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Logout user, clear storage and redirect
   */
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set({
      username: '',
      fullName: '',
      email: '',
      role: 'user',
      roleLabel: 'User'
    });
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  private handleAuthSuccess(res: AuthResponse) {
    if (res.accessToken) {
      localStorage.setItem(this.TOKEN_KEY, res.accessToken);
    }

    const isSuperUser = res.user.role === 'super-user' || res.user.role === 'admin';
    const userObj: CurrentUser = {
      id: res.user.id,
      username: res.user.email,
      fullName: res.user.name,
      email: res.user.email,
      role: isSuperUser ? 'super-user' : 'user',
      roleLabel: isSuperUser ? 'Super User' : 'User'
    };

    localStorage.setItem(this.USER_KEY, JSON.stringify(userObj));
    this.currentUser.set(userObj);
    this.isAuthenticated.set(true);
  }

  private getStoredUser(): CurrentUser {
    const stored = localStorage.getItem(this.USER_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // ignore parse error
      }
    }
    return {
      username: 'superuser@earthx.in',
      fullName: 'Chief Operations Lead',
      email: 'superuser@earthx.in',
      role: 'super-user',
      roleLabel: 'Super User'
    };
  }
}
