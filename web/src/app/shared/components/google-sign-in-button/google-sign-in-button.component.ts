import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { AuthService, GOOGLE_CLIENT_ID } from '../../../core/services/auth.service';

@Component({
  selector: 'app-google-sign-in-button',
  standalone: false,
  templateUrl: './google-sign-in-button.component.html',
  styleUrl: './google-sign-in-button.component.scss'
})
export class GoogleSignInButtonComponent implements AfterViewInit, OnDestroy {
  // Only used when the credential turns out to belong to a brand new account —
  // ignored for an existing user, who keeps their original role.
  @Input() role?: string;
  @Output() success = new EventEmitter<void>();
  @Output() authError = new EventEmitter<string>();

  @ViewChild('buttonContainer', { static: true }) buttonContainer!: ElementRef<HTMLDivElement>;

  configured = !!GOOGLE_CLIENT_ID;
  private pollHandle?: ReturnType<typeof setInterval>;

  constructor(private auth: AuthService) {}

  ngAfterViewInit(): void {
    if (!this.configured) return;

    if (window.google) {
      this.renderButton();
      return;
    }

    // The GSI script loads async, so it may not be on window yet — poll briefly for it.
    let attempts = 0;
    this.pollHandle = setInterval(() => {
      attempts++;
      if (window.google) {
        clearInterval(this.pollHandle);
        this.renderButton();
      } else if (attempts > 50) {
        clearInterval(this.pollHandle);
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  private renderButton(): void {
    window.google!.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => this.handleCredential(response.credential),
    });
    window.google!.accounts.id.renderButton(this.buttonContainer.nativeElement, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 320,
    });
  }

  private handleCredential(credential: string): void {
    this.auth.loginWithGoogle(credential, this.role).subscribe({
      next: () => this.success.emit(),
      error: err => this.authError.emit(err.error?.message || 'Google sign-in failed'),
    });
  }
}
