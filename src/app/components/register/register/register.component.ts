import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function match(controlName: string, matchingControlName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const c = group.get(controlName);
    const mc = group.get(matchingControlName);
    if (!c || !mc) return null;
    return c.value === mc.value ? null : { mismatch: true };
  };
}
@Component({
  selector: 'app-register',
  templateUrl: './register.component.html'
})
export class RegisterComponent {
loading = false;
error = '';

form = this.fb.group({
firstname: [''],
lastname: [''],
email: ['', [Validators.required, Validators.email]],
password: ['', [Validators.required, Validators.minLength(6)]],
confirmPassword: ['', [Validators.required]]
}, { validators: match('password', 'confirmPassword') });

constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private route: ActivatedRoute) {}

submit() {
if (this.form.invalid) { this.form.markAllAsTouched(); return; }const { firstname, lastname, email, password } = this.form.value;
const inviteToken = this.route.snapshot.queryParamMap.get('token') || undefined;

this.loading = true;
this.auth.register({
  email: email!,
  password: password!,
  firstname: firstname || undefined,
  lastname: lastname || undefined,
  inviteToken
}).subscribe({
  next: () => {
    this.loading = false;
    this.router.navigate(['/login'], { queryParams: { registered: '1' } });
  },
  error: (err: any) => {
    this.error = err?.error?.message || err?.message || 'Register failed';
    this.loading = false;
  }
});}}