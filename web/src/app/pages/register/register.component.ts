import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['visitor', Validators.required],
    });
    if (this.auth.isLoggedIn) this.router.navigate(['/']);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.auth.register(this.form.value).subscribe({
      next: () => this.router.navigate([(this.auth.isOwner || this.auth.isBand) ? '/dashboard' : '/']),
      error: err => {
        this.error = err.error?.message || 'Greška pri registraciji';
        this.loading = false;
      }
    });
  }

  onGoogleSuccess(): void {
    this.router.navigate([(this.auth.isOwner || this.auth.isBand) ? '/dashboard' : '/']);
  }

  onGoogleError(message: string): void {
    this.error = message;
  }
}
