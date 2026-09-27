# Journal

> Format : date — décision ou action — pourquoi — fichiers touchés.
> Entrées les plus récentes en haut. L'historique du portfolio qui occupait ce
> dépôt reste dans git (commit `90d44ec`, branche `feat/bootstrap`).

## 2026-09-27 — le POC complet

- **Hub** (Symfony 8.1, API Platform 4, Messenger, PostgreSQL) : webhooks
  signés et dédupliqués, upsert atomique « version la plus haute », polling
  avec recouvrement et rattrapage, quotas locaux, `Retry-After`, reprises,
  file d'échecs rejouable, journal de chaque décision, API d'exploitation.
- **Analyste d'incidents** : Claude en sortie structurée, moteur de règles de
  repli, filtre des preuves inventées, actions en liste fermée déclenchées
  par un humain (ADR 0004).
- **Console** Next.js : journal en direct, pannes, opérations, rejeu,
  analyse, contrôle « exactement une fois » contre la vérité terrain.
- **Preuves** : 99 tests PHPUnit, 33 Vitest sur le simulateur, 31 sur la
  console, 12 Playwright (bureau et mobile, dont axe), un test de résilience
  sous tempête ; PHPStan niveau max, Deptrac, PHP-CS-Fixer, ESLint strict.
  CI : tout, plus la construction et le démarrage des images Docker.
- **Défauts trouvés en chemin, tous corrigés et couverts par un test** :
  1. *Blocage actif du polling* sous tempête : un arriéré plus grand que la
     rafale du quota n'était jamais résorbé (curseur avancé seulement en fin
     de poll). → points de reprise par page (ADR 0006).
  2. *Tirages aléatoires partagés* dans le simulateur : régler une panne
     changeait le contenu des commandes. → trois flux séparés.
  3. *Exception réseau à l'envoi* non traduite en indisponibilité de la
     marketplace.
  4. *`UnknownChannel::$code`* redéclarait `Exception::$code` : erreur fatale
     sur un canal inconnu.
  5. *Contexte de journal vide* sérialisé `[]` au lieu de `{}` : la console
     rejetait toute la page du journal.
  6. *Zones défilantes* inaccessibles au clavier (axe, mobile).
  7. *Messages anciens* dans la file d'échecs sans une propriété ajoutée
     depuis : la liste plantait. → lecture tolérante (`MessageDescription`).
  8. *Pagination instable de `/api/orders`* : tri sur `lastChangedAt` seul,
     à la seconde ; des commandes changées dans la même seconde pouvaient
     apparaître deux fois ou disparaître d'une page à l'autre. Trouvé par le
     test de résilience (184 lignes lues, 3 doublons, 3 absentes). → tri
     total avec l'UUID v7 en départage ; test qui échoue sans le correctif.
  9. *Preuves hors écran* : l'analyste pouvait citer des entrées plus
     anciennes que celles chargées dans le journal. → l'analyse renvoie les
     entrées citées, affichées dans chaque constat.
  10. *Audit axe instable* : une ligne du journal mesurée en plein fondu.
     → audit en mouvement réduit (l'état stable de la page).
- **Mesure locale** : après une minute de `storm`, 180 commandes, toutes
  stockées une fois à leur dernière version et acquittées une fois ; 50
  webhooks en double et 11 versions périmées absorbés.
- **Outillage local** : Composer ne peut pas télécharger les paquets de dev
  depuis GitHub dans l'environnement distant ; en local, PHPUnit 9.6
  (paquet Ubuntu) et les phars PHPStan / PHP-CS-Fixer ; la CI utilise les
  versions de `composer.lock` (PHPUnit 13).

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
