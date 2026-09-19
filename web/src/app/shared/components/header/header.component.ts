import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  menuOpen = false;

  constructor(public auth: AuthService, public ts: TranslationService) {}

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  logout(): void {
    this.menuOpen = false;
    this.auth.logout();
  }
}
