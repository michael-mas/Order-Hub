# 0003 — Webhooks et polling, jamais l'un sans l'autre

- Statut : accepté (2026-09-26)

## Contexte

Un webhook est rapide mais peut se perdre, arriver deux fois ou dans le
désordre. Un canal peut aussi ne proposer aucun webhook. Une liste de commandes
peut montrer une commande en retard sur sa date de mise à jour (cohérence à
terme) : un polling qui avance son curseur sans recouvrement la manque pour
toujours — le simulateur le démontre dans un test.

## Décision

- Webhooks quand le canal en propose, pour la fraîcheur.
- Polling à fenêtre courte et fréquente **avec recouvrement**, pour tous les
  canaux, plus un rattrapage périodique plus large, pour la complétude.
- Déduplication par identifiant d'événement et par clé naturelle ; ordre des
  mises à jour par `version`, jamais par heure d'arrivée.

## Conséquences

- Une même commande arrive souvent par plusieurs chemins : l'idempotence n'est
  pas une option.
- Le coût en appels est borné par le quota local et par `Retry-After`.
