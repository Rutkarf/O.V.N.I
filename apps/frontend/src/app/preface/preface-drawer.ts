import { Component, output, signal } from '@angular/core';
import { BRAND } from '../core/brand';

@Component({
  selector: 'app-preface-drawer',
  templateUrl: './preface-drawer.html',
  styleUrl: './preface-drawer.css',
})
export class PrefaceDrawer {
  readonly brand = BRAND;
  readonly ouvert = signal(true);
  readonly ferme = output<void>();

  fermer(): void {
    this.ouvert.set(false);
    this.ferme.emit();
  }

  onFond(ev: MouseEvent): void {
    if (ev.target === ev.currentTarget) {
      this.fermer();
    }
  }
}
