import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'owner' | 'visitor' | 'band';
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Same OAuth 2.0 Client ID as backend/.env's GOOGLE_CLIENT_ID — it's not a secret, it's
// meant to be public (it only identifies which app is asking Google to sign someone in).
// Fill in once you've created a Web application OAuth client at console.cloud.google.com.
export const GOOGLE_CLIENT_ID = '';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(this.loadUser());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private loadUser(): User | null {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.currentUserSubject.value && !!localStorage.getItem('token');
  }

  get isOwner(): boolean {
    return this.currentUser?.role === 'owner';
  }

  get isBand(): boolean {
    return this.currentUser?.role === 'band';
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  register(data: { email: string; password: string; full_name: string; role: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(res => this.storeSession(res))
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  loginWithGoogle(credential: string, role?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/google`, { credential, role }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  logout(): void {
    // Best-effort — revokes the token server-side (Redis blacklist) so it can't be reused
    // even if it leaked, but logout still succeeds client-side even if this call fails
    // (backend down, Redis down, offline, etc.) since the token is being discarded either way.
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({ error: () => {} });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
  }
}
