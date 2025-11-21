import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service'; // path adjust kar lena

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isAuthEndpoint = /\/auth\/(login|register)/i.test(req.url);
    const token = this.auth.getToken?.();

    if (!isAuthEndpoint && token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
        // , withCredentials: true // agar cookies use kar rahe ho to uncomment
      });
    }
    return next.handle(req);
  }
}