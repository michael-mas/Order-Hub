# Manuel d'exploitation — Order Hub

À lire en entier au début de chaque session. Il prime sur les habitudes.
Documentation et échanges en **français** ; code, commentaires et noms en
**anglais**.

## 1. Ce qu'est ce dépôt

Un POC public : un hub d'intégration e-commerce composable qui importe les
commandes de places de marché capricieuses de façon fiable, observable et
exactement une fois. Il sert de vitrine au métier de Michael Mas (full stack
PHP/Symfony + React/TypeScript, intégrations e-commerce). Plan et état :
`docs/PLAN.md` ; décisions : `docs/adr/` ; journal : `docs/JOURNAL.md`.

## 2. Règles absolues

1. **Aucune donnée ni code d'employeur ou de client.** Tout est reconstruit sur
   des simulateurs et des API publiques. Données de démo générées, pseudonymes.
2. **Aucune mention d'outil assistant** dans les commits, PR, branches, docs,
   commentaires ou contenus publiés (seule exception décidée par Michael : le
   nom de ce fichier). Pas de ligne de co-auteur. Identité git : Michael Mas
   (`97169033+michael-mas@users.noreply.github.com`).
3. **Rien ne part sans les vérifications vertes** de l'application touchée
   (§ 3). Pas de contournement, pas de test désactivé.
4. **Le README ne décrit comme disponible que ce qui l'est.** Tenir à jour le
   tableau des composants et la feuille de route.
5. **Aucun chiffre de performance sans mesure reproductible** décrite dans le dépôt.
6. **Une question à la fois** à Michael, seulement si sa réponse change ce qu'on
   fait. Le reste : trancher et le noter dans `docs/JOURNAL.md`.
7. Travail poussé sur `main` (décision de Michael, 2026-09-27).

## 3. Commandes

| Commande                                            | Rôle                                           |
| --------------------------------------------------- | ---------------------------------------------- |
| `npm install`                                       | dépendances des espaces de travail Node        |
| `npm run verify`                                    | verify de chaque espace de travail Node        |
| `npm run format:check`                              | Prettier (hors `apps/hub` et Markdown)         |
| `npm run dev --workspace @order-hub/marketplace`    | simulateur sur le port 8100                    |
| `composer install` (dans `apps/hub`)                | dépendances du hub                             |

Node 22 (`.nvmrc`), PHP 8.4.

## 4. Architecture

```
apps/marketplace   simulateur (Hono, zod) — voir son README
  src/random.ts      PRNG à graine ; Math.random interdit par lint
  src/tokenBucket.ts quota d'un forfait
  src/signature.ts   signature HMAC des webhooks (t=…,v1=…)
  src/orders.ts      commandes, versions, pagination par curseur, visibilité différée
  src/webhooks.ts    émission : pertes, doublons, délais, reprises
  src/chaos.ts       configuration des pannes (zod), préréglages
  src/marketplace.ts un canal ; src/world.ts les deux canaux ; src/app.ts HTTP
apps/hub           Symfony 8.1 + API Platform 4 (squelette)
docs/              PLAN, ARCHITECTURE, adr/, JOURNAL
```

## 5. Contraintes techniques

- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`),
  ESLint `strictTypeChecked`, zéro avertissement.
- TypeScript 5.9 : typescript-eslint ne supporte pas encore ≥ 6.1.
- Tout aléatoire passe par `createRandom(seed)`. Temps et planification
  injectés : aucun test ne dort ni n'ouvre de socket.
- Hub : ordre des mises à jour par `version`, jamais par heure d'arrivée ;
  effets de bord par outbox ; actions de l'analyste IA dans une liste fermée,
  jamais exécutées sans humain (ADR 0004).
- Modèle IA par défaut : `claude-opus-5`, configurable par l'environnement.

## 6. Pièges connus

- Composer : les archives GitHub des paquets de dev sont refusées dans
  l'environnement distant tant qu'aucun `COMPOSER_AUTH` n'est fourni.
- Symfony génère `AGENTS.md` / `CLAUDE.md` dans `apps/hub` : ignorés par git.
- Hono : typer l'aide `problem()` avec `Context<E, P, any>` (le paramètre
  d'entrée des middlewares est `any`).
