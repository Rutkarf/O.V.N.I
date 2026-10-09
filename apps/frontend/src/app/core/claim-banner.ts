import { Component, input } from '@angular/core';

@Component({
  selector: 'app-claim-banner',
  template: `
    <div class="claim-strip" role="note">
      <div>
        <strong>{{ titre() }}</strong>
        {{ texte() }}
      </div>
    </div>
  `,
})
export class ClaimBanner {
  readonly titre = input('Niveau de claim');
  readonly texte = input(
    'Motif LIF + empreinte + graine = preuve logicielle. Scène 3D et CRISPR 2 = pédagogie. Validation PiCsL requise avant publication connectome.',
  );
}
