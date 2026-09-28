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

| Commande                                                | Rôle                                                   |
| ------------------------------------------------------- | ------------------------------------------------------ |
| `npm install`                                           | dépendances Node (simulateur, console, e2e)            |
| `npm run verify`                                        | typecheck + lint + tests de chaque espace Node         |
| `npm run format:check`                                  | Prettier (hors `apps/hub` et Markdown)                 |
| `npm run build --workspace @order-hub/console`          | build de la console (requis par `e2e/stack.sh`)        |
| `e2e/stack.sh start` / `stop`                           | système complet en natif, base dédiée `app_e2e`        |
| `npx playwright test` (dans `e2e/`)                     | bout en bout, accessibilité, résilience (`STORM_MS`)   |
| `docker compose up --build`                             | système complet en conteneurs (PostgreSQL)             |
| `docker build -f docker/demo/Dockerfile -t order-hub-demo .` | démo autonome, une image, SQLite éphémère          |
| Hub : voir `apps/hub/README.md`                         | php-cs-fixer, phpstan, deptrac, migrations, phpunit    |

Node 22 (`.nvmrc`), PHP 8.4, PostgreSQL 16. Playwright épinglé en 1.56.1
(Chromium préinstallé de l'environnement distant) ; `playwright-core` est
déclaré explicitement dans `e2e` pour qu'axe n'en tire pas une autre version.

## 4. Architecture

```
apps/marketplace   simulateur (Hono, zod) — voir son README
apps/hub           Symfony 8.1 + API Platform 4 + Messenger — voir son README
  src/Domain         pur, sans framework (Deptrac) ; src/Application cas d'usage et ports
  src/Infrastructure DBAL, HTTP, limiteur, Messenger, Claude ; src/Controller fins
apps/console       Next.js 16 ; proxy serveur en liste blanche (src/lib/routes.ts)
e2e                Playwright (console.spec, resilience.spec) ; stack.sh
docs/              PLAN, ARCHITECTURE, adr/ (0001 → 0008), JOURNAL, console.png
SECURITY.md        modèle de menace ; .trivyignore.yaml : exceptions datées
compose.yaml       postgres, migrate, hub, worker, marketplace, console
docker/demo/       image unique de la démo publique + start.sh (testable en natif)
render.yaml        Blueprint Render de la démo
```

## 5. Contraintes techniques

- TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`),
  ESLint strict, zéro avertissement. TypeScript 5.9 : typescript-eslint ne
  supporte pas encore ≥ 6.1.
- PHP : PHPStan niveau max sans baseline, `@Symfony` + risky, Deptrac.
  Lectures de lignes SQL via `Row::string/int` (pas de cast silencieux).
- Tout aléatoire du simulateur passe par `createRandom(seed)` ; trois flux
  séparés (commandes, pannes webhooks/visibilité, pannes API).
- Hub : SQL portable PostgreSQL + SQLite (ADR 0007) — pas de `xmax`, pas de
  type `uuid` Doctrine (binaire hors PostgreSQL : utiliser `guid`) ; la suite
  PHPUnit tourne sur les deux (`DATABASE_URL=sqlite:///%kernel.project_dir%/var/test.db`).
- Hub, couches (ADR 0008, Deptrac) : `Application` ne dépend que de `Domain`
  (ports : `Transactions`, `MessageDispatcher`, `Locks`…) ; adaptateurs et
  handlers Messenger dans `Infrastructure` ; classes du domaine mappées en XML
  (`config/doctrine/`). API du hub derrière `HUB_API_TOKEN` (refus par défaut).
- Sécurité : aucune écriture relayée par la console sans règle de limite
  (`src/lib/routes.ts`, testé) ; images non root (UID numérique), épinglées par
  digest ; actions CI épinglées par SHA.
- Hub : ordre des versions par `version` dans des upserts conditionnels ; tout effet de
  bord dispatché dans la transaction de la décision (ADR 0005) ; points de
  reprise par page (ADR 0006) ; chaque décision journalisée.
- Analyste IA : liste fermée d'actions, jamais exécutées sans humain ; preuves
  filtrées ; moteur de règles sans clé (ADR 0004). Modèle par défaut
  `claude-opus-5`.
- Tests du hub : doublures dans `config/services_test.yaml` (horloge,
  marketplace, limiteur, modèle) ; aucun test n'attend ni n'appelle le réseau.

## 6. Pièges connus

- Environnement distant : Composer ne télécharge pas les paquets de dev
  depuis GitHub. En local : `phpunit` 9.6 du paquet Ubuntu (`apt-get install
  phpunit`) avec une config hors dépôt (il ne lit pas `phpunit.dist.xml`), et
  les phars PHPStan / PHP-CS-Fixer (releases GitHub, accessibles). Les tests
  restent compatibles 9.6 et 13 : méthodes `test*`, `@dataProvider` doublé de
  l'attribut.
- `pkill -f motif` / `pgrep -f motif` dans une commande shell tue aussi le
  shell dont la ligne contient le motif : passer par un script.
- `php -S` : sans `-d variables_order=EGPCS`, Symfony ignore les variables
  d'environnement et lit `.env` (le web et le worker divergent de base).
- Une réponse JSON d'un tableau PHP vide sort `[]` : forcer `(object)` pour un
  objet (contexte du journal).
- `MapQueryString` répond `404` par défaut sur une validation ratée : fixer
  `validationFailedStatusCode: 422`.
- eslint-plugin-react + ESLint 10 : version de React explicite dans
  `settings`, sinon plantage.
- Next.js 16 : `RouteContext` vient de `next typegen` (le script `typecheck`
  le lance) ; `next start` avertit en sortie `standalone` mais fonctionne.
- Docker local derrière le proxy : `--secret id=extra_ca,src=<bundle CA>` pour
  les images Node ; l'image du hub ne se construit qu'en CI (Composer).
- Symfony génère `AGENTS.md` / `CLAUDE.md` dans `apps/hub`, `next dev` dans
  `apps/console` : ignorés par git, ne jamais les commiter.
- `rm -rf chemin/*` après un `cd` est bloqué : vider les caches avec
  `bin/console cache:clear`.
- SQLite (démo) : transactions d'écriture en `BEGIN IMMEDIATE` (middleware
  `SqliteWriteTransactions`), sinon « database is locked » sous charge.
- Deptrac, Composer (dev) : non installables ici ; Deptrac tourne en CI.
- Docker local : si le démon s'arrête, `dockerd &`. Trivy / Hadolint en local :
  `docker run --network host` avec `SSL_CERT_FILE` pointant sur
  `/root/.ccr/ca-bundle.crt` monté (proxy TLS).
- Démo en natif : `HUB_DIR=… SIMULATOR_DIR=… CONSOLE_SERVER=…/standalone/apps/console/server.js
  DATA_DIR=… docker/demo/start.sh` (copier `.next/static` dans la sortie standalone).
