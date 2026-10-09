import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BRAND } from './core/brand';
import { AuthService } from './core/auth.service';
import { InstrumentStore } from './core/instrument.store';
import { findBrain, findMotif } from './organism-select/hybrid-composition';
import { PrefaceDrawer } from './preface/preface-drawer';
import { OrganismSelectDrawer } from './organism-select/organism-select-drawer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PrefaceDrawer, OrganismSelectDrawer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly brand = BRAND;
  readonly auth = inject(AuthService);
  readonly store = inject(InstrumentStore);
  readonly easterOpen = signal(false);
  /** Drawer taxonomie / sélection O.V.N.I. — après la préface */
  readonly organismSelectOpen = signal(false);
  /** Visible une fois les deux tiroirs passés, et conservé pendant la navigation. */
  readonly showBelief = signal(false);
  private eggBuffer = '';
  private logoTapCount = 0;
  private logoTapTimer: ReturnType<typeof setTimeout> | null = null;

  crossingLabel(): string {
    const org = this.store.selectedOrganismLabel();
    const motif = findMotif(this.store.selectedMotifId())?.name ?? '';
    const brain = findBrain(this.store.selectedBrainAtlasId())?.name ?? '';
    return [org, motif, brain].filter(Boolean).join(' × ');
  }

  onPrefaceClosed(): void {
    this.organismSelectOpen.set(true);
  }

  onOrganismChosen(_id: string): void {
    this.organismSelectOpen.set(false);
    this.showBelief.set(true);
  }

  onOrganismSelectClosed(): void {
    this.organismSelectOpen.set(false);
    this.showBelief.set(true);
  }

  /** Easter egg : taper « vivant » ou 5 clics rapides sur le logo. */
  @HostListener('document:keydown', ['$event'])
  onDocKey(ev: KeyboardEvent): void {
    if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    this.eggBuffer = (this.eggBuffer + ev.key.toLowerCase()).slice(-12);
    if (this.eggBuffer.endsWith('vivant')) {
      this.easterOpen.set(true);
      this.eggBuffer = '';
    }
  }

  onLogoSecret(): void {
    this.logoTapCount += 1;
    if (this.logoTapTimer) clearTimeout(this.logoTapTimer);
    this.logoTapTimer = setTimeout(() => {
      this.logoTapCount = 0;
    }, 2200);
    if (this.logoTapCount >= 5) {
      this.logoTapCount = 0;
      this.easterOpen.set(true);
    }
  }

  closeEaster(): void {
    this.easterOpen.set(false);
  }
}
