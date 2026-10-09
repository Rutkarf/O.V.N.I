/** Identité produit — toujours déployer le sigle avec sa signification. */
export const BRAND = {
  /** Sigle affiché */
  short: 'O.V.N.I.',
  /** Développement obligatoire (évite la confusion « ovni » populaire) */
  full: 'Organisme Vivant Numérique Intelligent',
  /** Titre UI compact */
  title: 'O.V.N.I.',
  /** Sous-titre / claim */
  tagline: 'O.V.N.I. — Organisme Vivant Numérique Intelligent',
  /** Une ligne d’explication */
  explain:
    'O.V.N.I. signifie Organisme Vivant Numérique Intelligent : un individu numérique ' +
    'dont le cerveau est un moteur LIF sur connectome — pas un « ovni » au sens populaire.',
} as const;
