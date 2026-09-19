import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';
  private returnUrl = '/';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    if (this.auth.isLoggedIn) this.router.navigate([this.returnUrl]);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.value;
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate([this.returnUrl]),
      error: err => {
        this.error = err.error?.message || 'Greška pri prijavi';
        this.loading = false;
      }
    });
  }

  onGoogleSuccess(): void {
    this.router.navigate([this.returnUrl]);
  }

  onGoogleError(message: string): void {
    this.error = message;
  }
}
