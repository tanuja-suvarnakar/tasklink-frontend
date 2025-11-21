import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';


// If you already have a User model, you can remove this and use yours
export interface User {
  email: string;
  firstname?: string;
  lastname?: string;
  name?: string; // convenience for UI
}

export interface AuthResponse {
  token: string;
  email: string;
  firstname?: string;
  lastname?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = `${environment.apiBase}/auth`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const token = this.getToken();
    const storedUser = this.getStoredUser();
    if (token && !this.isTokenExpired(token)) {
      // prefer stored user (has names); fallback to token decode
      this.currentUserSubject.next(storedUser || this.decodeUserFromToken(token));
    }
  }

  login(payload: { email: string; password: string; inviteToken?: string }) {
  return this.http.post<AuthResponse>(`${this.base}/login`, payload).pipe(
    tap(res => this.setSession(res))
  );
}

register(payload: { email: string; password: string; firstname?: string; lastname?: string; inviteToken?: string }) {
  const body: any = {
    email: payload.email,
    password: payload.password,
    firstname: payload.firstname,
    lastname: payload.lastname,
    inviteToken: payload.inviteToken
  };
  return this.http.post<AuthResponse>(`${this.base}/register`, body).pipe(
    tap(res => this.setSession(res))
  );
}

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // ————— helpers —————

  private setSession(res: AuthResponse) {
    localStorage.setItem('token', res.token);

    const user: User = {
      email: res.email,
      firstname: res.firstname,
      lastname: res.lastname,
      name: [res.firstname, res.lastname].filter(Boolean).join(' ').trim() || res.email
    };

    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getStoredUser(): User | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private decodeUserFromToken(token: string): User {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // if your JWT includes given_name/family_name, you can pick them here
      const firstname = payload.given_name || payload.firstname;
      const lastname = payload.family_name || payload.lastname;
      const email = payload.sub || payload.email || '';
      return {
        email,
        firstname,
        lastname,
        name: [firstname, lastname].filter(Boolean).join(' ').trim() || email
      };
    } catch {
      return { email: '' };
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp ? payload.exp * 1000 : 0;
      return exp ? Date.now() > exp : false;
    } catch {
      return true;
    }
  }
}