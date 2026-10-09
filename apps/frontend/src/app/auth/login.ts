import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BRAND } from '../core/brand';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  readonly brand = BRAND;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  mode: 'login' | 'register' = 'login';
  email = '';
  password = '';
  displayName = '';
  readonly error = signal('');
  readonly pending = signal(false);

  submit(): void {
    this.error.set('');
    this.pending.set(true);
    const req =
      this.mode === 'login'
        ? this.auth.login(this.email, this.password)
        : this.auth.register(this.email, this.password, this.displayName || 'Researcher');

    req.subscribe({
      next: () => {
        this.pending.set(false);
        void this.router.navigateByUrl('/experiment');
      },
      error: (err) => {
        this.pending.set(false);
        this.error.set(err?.error?.message || err?.message || 'échec auth');
      },
    });
  }
}
