# 0001 — Un monorepo, trois applications

- Statut : accepté (2026-09-26)

## Contexte

Le projet réunit un hub PHP, un simulateur et une console TypeScript. Ils
partagent des contrats (format des commandes, signature des webhooks) et un
scénario de bout en bout.

## Décision

Un seul dépôt : `apps/hub` (Composer), `apps/marketplace` et `apps/console`
(espaces de travail npm), `e2e` à la racine. Chaque application a son propre
outillage et sa commande `verify` ; la racine les enchaîne.

## Conséquences

- Un changement de contrat et ses deux côtés passent dans le même commit.
- La CI peut lancer tout le système pour le test de résilience.
- Deux gestionnaires de paquets (Composer, npm) : assumé, c'est la réalité d'une
  équipe PHP + TypeScript.
