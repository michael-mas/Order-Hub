# Plan

## Objectif

Un projet public, solide, qui montre le métier d'un développeur full stack
PHP/Symfony + React/TypeScript spécialisé dans les intégrations e-commerce :
rendre fiable et observable un flux de commandes venu de canaux hétérogènes.

« Solide » veut dire :

- dépôt public, `README` qui explique le problème, l'architecture et les choix
  (ADR courts dans `docs/adr/`) ;
- démo en ligne utilisable sans compte, sur données fictives ;
- `docker compose up` suffit pour tout lancer en local ;
- tests de tous les niveaux et CI verte à chaque commit ;
- un périmètre **fini** : un flux complet et robuste plutôt que dix
  fonctionnalités à moitié faites ;
- aucun chiffre de performance publié sans mesure reproductible décrite dans le
  dépôt.

## Choix du sujet

Trois pistes comparées : e-commerce composable (MACH), SaaS « privacy-first » à
IA locale, certification hybride Web2/Web3. Retenu : **MACH**, cœur du métier.
Le Web3 est écarté (signal faible pour la cible, deux écosystèmes nouveaux).
L'IA locale reste la piste du second projet (§ Suite).

## Jalons

| # | Contenu                                                                                             | État |
| - | --------------------------------------------------------------------------------------------------- | ---- |
| 0 | Monorepo, outillage TypeScript strict, conventions                                                  | ✅    |
| 1 | Simulateur de marketplace : deux canaux, quotas, pannes, webhooks signés, graine, tests de propriétés | ✅    |
| 2 | Hub : domaine, webhooks (signature, idempotence), polling avec recouvrement, quota, journal         | ✅    |
| 3 | Hub : transaction commande + message (outbox), reprises, file d'échecs rejouable, accusés de réception | ✅ |
| 4 | Analyste d'incidents IA (Claude, sortie structurée, preuves vérifiées, repli à base de règles)      | ✅    |
| 5 | Console Next.js : journal en direct, pannes, opérations, rejeu, diagnostic, contrôle « exactement une fois » | ✅ |
| 6 | `compose.yaml`, CI, Playwright + accessibilité, test de résilience sous `storm`                     | ✅    |
| 7 | Démo autonome hébergeable (image unique, SQLite éphémère, `render.yaml`)                            | ✅    |
| 8 | Durcissement après relecture DevOps / sécurité / full stack (voir `SECURITY.md`, ADR 0008)           | ✅    |
| 9 | Mise en ligne : offre gratuite Render (<https://order-hub-demo.onrender.com>), lien depuis le portfolio | ✅ |

Hors périmètre, assumé : authentification des marchands, multi-devise,
back-office complet, paiement.

## Tests visés

| Niveau                 | Outil                                   | Où                   |
| ---------------------- | --------------------------------------- | -------------------- |
| Unitaire               | Vitest, PHPUnit                         | simulateur, hub      |
| Propriétés             | fast-check                              | simulateur           |
| Intégration (base)     | PHPUnit + PostgreSQL, transactions annulées | hub              |
| API / fonctionnel      | Hono `app.request`, noyau Symfony       | simulateur, hub      |
| Architecture           | Deptrac (couches strictes, ADR 0008)    | hub                  |
| Sécurité               | gardes testées, CodeQL, Trivy, audits   | tout le dépôt        |
| Accessibilité          | axe (WCAG 2.1 AA)                       | console              |
| Analyse statique       | TypeScript strict, ESLint, PHPStan max  | partout              |
| Bout en bout           | Playwright + axe                        | console + hub + simulateur |
| Résilience             | scénario `storm` + vérité terrain du simulateur | tout le système |

## Garde-fous

- Aucun code, schéma, nom interne ni donnée d'un employeur ou de ses clients :
  tout est reconstruit sur des simulateurs et des API publiques, sur du temps et
  du matériel personnels.
- Vérifier les clauses du contrat de travail (propriété intellectuelle,
  exclusivité, non-concurrence) avant de promouvoir le projet.
- Données de démo générées, jamais réelles.

## Suite : « Catalog Lens »

Second projet, indépendant : enrichissement de catalogue **dans le navigateur**
(Transformers.js, WebGPU avec repli WASM), sans serveur — rien ne quitte la
machine du marchand. Rapprochement produit → taxonomie de marketplace par
embeddings, contrôles de conformité déterministes, export au format consommé
par Order Hub.
