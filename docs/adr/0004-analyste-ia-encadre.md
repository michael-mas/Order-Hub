# 0004 — Un analyste d'incidents IA encadré

- Statut : accepté (2026-09-26)

## Contexte

Face à un journal chargé (reprises, doublons, quotas, échecs), un diagnostic
rapide a de la valeur. Un modèle de langage peut inventer des faits ou
déclencher des actions risquées.

## Décision

- Un seul appel à Claude, avec **sortie structurée** (JSON Schema) : résumé,
  gravité, constats avec preuves, recommandations.
- Chaque preuve est un identifiant d'événement ; celles qui n'existent pas dans
  le contexte fourni sont retirées avant affichage.
- Les recommandations viennent d'une **liste fermée** d'actions ; l'analyste
  n'exécute rien, un humain déclenche.
- Sans clé d'API (CI, démo publique à coût nul), un **moteur de règles**
  produit le même format. Les tests n'appellent jamais le modèle.

## Conséquences

- Le diagnostic reste vérifiable : chaque affirmation pointe vers le journal.
- La démo fonctionne sans secret ; la clé, si fournie, n'améliore que la
  qualité du diagnostic.
