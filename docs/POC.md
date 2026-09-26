# Plan — deux POC publics

> Statut : **proposition**, en attente de l'arbitrage de Michael (question en
> fin de document). Rédigé le 2026-09-26.

## 1. Objectif

Deux projets publics, solides, qui prouvent ce que le portfolio affirme :
**full stack PHP/Symfony + React/TypeScript, spécialiste des intégrations
e-commerce**. Un POC vaut pour ce qu'il démontre à un recruteur de la cible
(éditeurs SaaS B2B de l'écosystème e-commerce, entreprises produit en
Symfony), pas pour la mode de son sujet.

« Solide » veut dire, pour chacun :

- dépôt public, `README` qui explique le problème, l'architecture et les
  choix (ADR courts dans `docs/adr/`) ;
- démo en ligne, utilisable sans compte, avec des données fictives ;
- `docker compose up` suffit pour tout lancer en local ;
- tests (PHPUnit, Vitest, Playwright) et CI verte à chaque commit ;
- un périmètre **fini** : mieux vaut un flux complet et robuste que dix
  fonctionnalités à moitié faites ;
- une étude de cas sur le portfolio, sous les mêmes règles que les autres
  (pas de chiffre affiché en tuile, pas de pourcentage).

## 2. Évaluation des trois candidats

| Critère                                    | E-commerce composable (MACH)          | SaaS privacy-first, IA en local                  | Certification hybride Web2 / Web3        |
| ------------------------------------------ | ------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| Cohérence avec le positionnement           | Totale : c'est le cœur du métier      | Bonne si le cas d'usage est e-commerce           | Faible : hors du récit                   |
| Compétences de la colonne ① mobilisées     | PHP, Symfony, React, TS, tests, SQL   | React, TS, tests                                 | React, TS ; Solidity à apprendre de zéro |
| Signal pour la cible                       | Fort                                  | Moyen à fort (sujet actuel, différenciant)       | Faible, parfois négatif (image « crypto ») |
| Risque d'échouer à être « solide »         | Moyen (périmètre à tenir court)       | Moyen (modèles lourds, compatibilité navigateurs) | Élevé (deux écosystèmes nouveaux)        |
| Coût d'hébergement de la démo              | Faible (un conteneur + une base)      | Nul (site statique, tout tourne chez l'usager)   | Faible (testnet), mais wallet requis     |

**Recommandation : MACH + IA en local.** Le Web3 est écarté : il demande
d'apprendre deux écosystèmes pour un signal faible auprès de la cible, et il
ne prolonge aucun fait de `PARCOURS.md`.

Les deux retenus se répondent sans dépendre l'un de l'autre : le second
prépare des fiches produit que le premier distribue.

## 3. POC 1 — « Order Hub » : intégration e-commerce composable

### Le problème montré

Un marchand vend sur plusieurs canaux. Les commandes arrivent par des API
hétérogènes, avec des quotas, des webhooks qui échouent ou arrivent en double,
des pannes. Le POC montre comment on rend ce flux **fiable et observable**.

C'est le terrain des cas A et B, mais **reconstruit de zéro sur des API
publiques et des simulateurs** : aucune ligne, aucune structure, aucun nom
repris de l'employeur (voir § 6).

### Architecture (MACH)

- **Headless** : vitrine Next.js + React/TS qui consomme uniquement l'API.
- **API-first** : Symfony 7 + API Platform, contrat OpenAPI publié, clients
  TypeScript générés depuis le contrat.
- **Microservices raisonnés** : deux services seulement — `catalog` et
  `orders` — plus un bus (Symfony Messenger sur RabbitMQ ou Redis). Pas plus :
  la démonstration porte sur les frontières et les contrats, pas sur le
  nombre de conteneurs.
- **Cloud-native** : conteneurs, configuration par variables d'environnement,
  vérifications de santé, logs structurés, traces OpenTelemetry.

Briques tierces, en mode test : Stripe (paiement), Meilisearch (recherche),
éventuellement Sylius (moteur e-commerce Symfony) côté catalogue si le temps
presse.

### La pièce maîtresse : un simulateur de marketplace

Un petit service qui joue une place de marché **indocile**, réglable depuis la
démo : quota d'appels par forfait, latence, erreurs 5xx aléatoires, webhooks
dupliqués ou hors d'ordre, signature HMAC. Face à lui, le hub montre :

- webhooks vérifiés (HMAC) et **idempotents** (clé d'idempotence stockée) ;
- **seau de jetons** par connecteur, réglé sur le forfait ;
- **outbox** transactionnelle, reprises avec backoff, file des messages en
  échec rejouable ;
- sondage à fenêtre courte + rattrapage périodique quand le canal n'offre pas
  de webhook ;
- une page « journal des événements » en direct, lisible par un non-initié.

Le visiteur casse lui-même le canal et regarde le système encaisser.

### Découpage

| Jalon | Contenu                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------- |
| 1     | Squelette : dépôt, `docker compose`, CI, API Platform, contrat OpenAPI, vitrine qui liste le catalogue |
| 2     | Simulateur de marketplace + connecteur : quota, reprises, idempotence, tests d'intégration        |
| 3     | Webhooks signés, outbox, file d'échecs rejouable                                                  |
| 4     | Journal des événements en direct, traces, panneau de réglage du simulateur                         |
| 5     | Paiement Stripe en mode test, Playwright de bout en bout, `README`, ADR, déploiement              |

Hors périmètre, assumé : authentification des marchands, multi-devise,
back-office complet.

## 4. POC 2 — « Catalog Lens » : enrichissement de catalogue, sans serveur

### Le problème montré

Préparer un catalogue pour une marketplace : classer chaque produit dans la
taxonomie du canal, compléter les attributs manquants, signaler les fiches
non conformes. Les marchands hésitent à envoyer leur catalogue à un service
tiers. Ici, **rien ne quitte le navigateur**.

### Architecture

- Application React/TS **100 % statique** (hébergement gratuit, aucun
  backend). L'argument « privacy-first » se vérifie : onglet réseau vide après
  le chargement du modèle.
- Inférence locale : Transformers.js (ONNX Runtime Web), WebGPU si présent,
  repli WASM sinon — même discipline de paliers que ce portfolio.
- Petits modèles spécialisés plutôt qu'un LLM : embeddings pour rapprocher un
  produit d'une catégorie de taxonomie, classification zéro-shot, règles
  déterministes pour la conformité (longueur de titre, EAN, attributs requis).
- Travail dans un Web Worker ; l'interface reste fluide sur 5 000 lignes.
- Import CSV, export CSV / JSON au format attendu par le POC 1.
- Cache du modèle (Cache Storage) et mode hors ligne (service worker).

### Découpage

| Jalon | Contenu                                                                                  |
| ----- | ---------------------------------------------------------------------------------------- |
| 1     | Import CSV, règles de conformité déterministes, tableau virtualisé, tests Vitest         |
| 2     | Worker + modèle d'embeddings, rapprochement avec une taxonomie publique, score de confiance |
| 3     | WebGPU / WASM avec détection de capacités, cache du modèle, hors ligne                   |
| 4     | Revue humaine (accepter / corriger), export, Playwright, `README`, déploiement           |

Hors périmètre, assumé : génération de texte libre, entraînement de modèle.

Taxonomie : une taxonomie publique sous licence réutilisable (à vérifier avant
usage). Catalogue de démo : données générées, aucun produit réel.

## 5. Ordre et rythme

1. **POC 1 d'abord** : il porte le message principal du portfolio.
2. POC 2 ensuite ; plus court, il peut démarrer pendant les finitions du 1.
3. Chaque POC n'entre sur le portfolio qu'une fois **en ligne et vert** :
   jamais de carte « bientôt ».

Durée : non estimée ici, elle dépend du temps disponible hors du poste actuel.
Chaque jalon est livrable seul, ce qui permet de s'arrêter proprement.

## 6. Garde-fous

- **Contrat de travail** : vérifier les clauses de propriété intellectuelle,
  d'exclusivité et de non-concurrence avant de publier un projet proche du
  métier de l'employeur. Le POC 1 reste générique (simulateurs, API publiques),
  mais c'est à Michael de confirmer.
- **Aucun code, schéma, nom interne ni donnée** de l'employeur ou de ses
  clients. Écrit sur du temps et du matériel personnels.
- Compétences : un POC peut faire progresser une technologie de la colonne ②
  (RabbitMQ, Redis) ; elle n'entre dans la liste des compétences du site que
  si Michael la reclasse dans `PARCOURS.md`.
- Aucun chiffre de performance publié sans mesure reproductible décrite dans
  le dépôt.

## 7. Question à Michael

Valides-tu le duo **E-commerce composable + IA en local**, en écartant le
Web3 ?
