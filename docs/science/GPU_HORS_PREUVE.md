# Accélération graphique — hors chemin de preuve

L’option GPU / simulateurs massifs (ex. moteurs externes) n’est **pas** sur le chemin de publication.

| Chemin | Autorisé |
|---|---|
| Intégration-décharge mono-compartiment déterministe | oui (preuve) |
| Magasin SQLite + balayages async CPU | oui (échelle) |
| GPU / modèles conductance non déterministes | démo / exploration seulement |

Tout export Méthodes doit mentionner le modèle `lif_mono` et l’empreinte du jeu.
