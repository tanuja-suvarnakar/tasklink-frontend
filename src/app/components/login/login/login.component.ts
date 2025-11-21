import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
// export class LoginComponent implements OnInit {
//   loading = false;
//   error = '';
//   success = '';

//   form = this.fb.group({
//     email: ['', [Validators.required, Validators.email]],
//     password: ['', [Validators.required, Validators.minLength(6)]]
//   });

//   constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

//   ngOnInit(): void {
//     this.route.queryParamMap.subscribe(q => {
//       if (q.get('registered') === '1') {
//         this.success = 'Account created. Please log in.';
//       }
//     });
//   }

//   submit() {
//     if (this.form.invalid) { this.form.markAllAsTouched(); return; }
//     this.loading = true;
//     this.auth.login(this.form.value as any).subscribe({
//       next: () => {
//         this.loading = false;
//         this.router.navigate(['/dashboard']);
//       },
//       error: (err: any) => {
//         this.error = err?.error?.message || err?.message || 'Login failed';
//         this.loading = false;
//       }
//     });
//   }
// }

export class LoginComponent implements OnInit {
  loading = false;
  error = '';
  success = '';
  inviteToken: string | null = null;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService // 👈 add this if not already injected
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(q => {
      this.inviteToken = q.get('token'); // ✅ store invite token if present

      if (q.get('registered') === '1') {
        this.success = 'Account created. Please log in.';
      }
    });
  }

submit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  this.loading = true;

  const email = this.form.value.email ?? '';
  const password = this.form.value.password ?? '';

  // ✅ Ensure inviteToken is a string or undefined
  const inviteToken = this.inviteToken || undefined;

  const payload = { email, password, inviteToken };

  this.auth.login(payload).subscribe({
    next: (user: any) => {
      this.loading = false;
      this.router.navigate(['/dashboard']);
    },
    error: (err: any) => {
      this.error = err?.error?.message || err?.message || 'Login failed';
      this.loading = false;
    }
  });
}

}
