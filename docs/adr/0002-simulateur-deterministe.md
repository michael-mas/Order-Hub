# 0002 — Un simulateur de marketplace déterministe plutôt que des bouchons

- Statut : accepté (2026-09-26)

## Contexte

Les défauts qui comptent (webhook perdu, doublon, désordre, liste en retard,
quota) sont rares et aléatoires en production. Des bouchons figés ne les
reproduisent pas ; un vrai bac à sable de marketplace ne les produit pas à la
demande.

## Décision

Un service à part entière, réglable à chaud, dont tout l'aléatoire dérive d'une
graine. Trois flux séparés : contenu des commandes, pannes des webhooks et de
visibilité, pannes de l'API. Une route de **vérité terrain** expose ce que le
hub est censé détenir.

## Conséquences

- Un scénario se rejoue à l'identique ; régler une panne ne change pas les
  commandes (vérifié par un test).
- Le test de résilience compare l'état du hub à la vérité terrain au lieu de
  deviner.
- Le visiteur de la démo peut provoquer les pannes lui-même.
