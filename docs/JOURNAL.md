# Journal

> Format : date — décision ou action — pourquoi — fichiers touchés.
> Entrées les plus récentes en haut. L'historique du portfolio qui occupait ce
> dépôt reste dans git (commit `90d44ec`, branche `feat/bootstrap`).

## 2026-09-27

- **Le dépôt devient Order Hub.** Renommé `michael-mas/order-hub`, rendu
  public ; `main` porte désormais le POC, plus du tout le portfolio.
  Documentation réécrite : `README.md`, `docs/PLAN.md`, `docs/ARCHITECTURE.md`,
  `docs/adr/0001` à `0004`, `CLAUDE.md`, `apps/marketplace/README.md`.
- **Bloqué : outillage de test PHP.** Composer ne peut plus télécharger les
  archives GitHub des paquets de dev (PHPUnit, PHPStan, PHP-CS-Fixer, Deptrac) :
  « Could not authenticate against github.com ». À lever par un secret
  `COMPOSER_AUTH` (jeton GitHub en lecture seule) ou un accès réseau plus large.
  Tant que ce n'est pas levé, le hub ne peut pas être livré testé.

## 2026-09-26

- **Simulateur de marketplace terminé** (`apps/marketplace`) : deux canaux
  (`nova` webhooks + API, `atlas` API seule), seau de jetons par forfait avec
  `Retry-After` exact, erreurs `503`, latence, cohérence à terme, webhooks
  perdus / dupliqués / désordonnés signés HMAC, reprises avec backoff,
  préréglages `calm` / `busy` / `storm`, plan de contrôle et vérité terrain.
  33 tests dont des tests de propriétés. Un test de propriété a trouvé un vrai
  défaut : les tirages de pannes partageaient le flux aléatoire des commandes,
  donc régler une panne changeait les commandes. Corrigé par trois flux séparés.
- **Hub** : squelette Symfony 8.1 + API Platform 4, Doctrine, Messenger,
  Rate Limiter, Lock, SDK PHP d'Anthropic.
- **Sujet retenu** : e-commerce composable (MACH) ; Web3 écarté ; IA locale
  gardée pour un second projet. → `docs/PLAN.md`.
- **TypeScript 5.9** et non 7 : typescript-eslint ne supporte pas encore
  TypeScript ≥ 6.1.
