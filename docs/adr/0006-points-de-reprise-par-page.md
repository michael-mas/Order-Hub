# 0006 — Des points de reprise par page, pas par poll

- Statut : accepté (2026-09-27), après un défaut trouvé sous tempête

## Contexte

La première version avançait le curseur de polling seulement quand toutes les
pages d'un poll étaient lues. Sous le préréglage `storm`, l'arriéré d'`atlas`
comptait plus de pages que la rafale du quota local : chaque poll lisait
quatre pages, s'arrêtait, et recommençait au même endroit. Le curseur
n'avançait jamais — un blocage actif, visible dans le journal et mesuré contre
la vérité terrain du simulateur. Le rattrapage de 15 minutes avait le même
défaut.

## Décision

- Après chaque page, le point de reprise avance au plus grand `updated_at`
  lu. Les pages étant triées par `(updated_at, id)`, tout ce qui précède est
  traité ; les commandes partageant ce dernier instant sont relues, sans
  effet grâce à la déduplication.
- Le point de reprise est exprimé dans l'horloge de la marketplace, pas celle
  du hub : aucun décalage d'horloge ne peut faire sauter une commande.
- Le rattrapage a son propre point de reprise : un balayage interrompu
  reprend, un balayage terminé repart de toute la fenêtre.
- « Quota local atteint » n'est journalisé qu'une fois par épisode.

## Conséquences

- Un arriéré de n'importe quelle taille se résorbe, au rythme du quota.
- Le scénario est couvert par `ChannelPollerTest` et par le test de
  résilience de bout en bout.
