/** Libellés français uniquement (aucune étiquette anglaise côté interface). */

export function actionFr(code: string | null | undefined): string {
  switch (code) {
    case 'ESCAPE':
      return 'Fuite';
    case 'EAT':
      return 'Alimentation';
    case 'IDLE':
      return 'Repos';
    default:
      return code || '—';
  }
}

/** Alias historique — affiche uniquement le français. */
export function actionFrEn(code: string | null | undefined): string {
  return actionFr(code);
}

export function motifFr(id: string | null | undefined): string {
  switch (id) {
    case 'escape_feed_v1':
      return 'Fuite × alimentation';
    case 'vision_menace_v1':
      return 'Vision menace';
    case 'gout_alimentation_v1':
      return 'Goût et alimentation';
    case 'olfaction_champignon_v1':
      return 'Olfaction corps pédonculé';
    case 'cour_agression_v1':
      return 'Cour et agression (hypothèse)';
    case 'horloge_sommeil_v1':
      return 'Horloge / sommeil';
    case 'malecns_roi_fuite_lop_v1':
      return 'ROI MaleCNS fuite LOP/VEN';
    case 'flywire_roi_fuite_lop_v1':
      return 'ROI FlyWire contrôle fuite';
    default:
      return id || '—';
  }
}
