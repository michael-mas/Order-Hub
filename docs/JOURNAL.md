# Journal

> Format : date — décision ou action — pourquoi — fichiers touchés.
> Entrées les plus récentes en haut. L'historique du portfolio qui occupait ce
> dépôt reste dans git (commit `90d44ec`, branche `feat/bootstrap`).

## 2026-09-29 — premier déploiement Render : binaire refusé

- **Constat** (déploiement de Michael) : `frankenphp: Operation not
  permitted`, la démo redémarre en boucle. Le binaire FrankenPHP amont porte
  une capability de fichier (`cap_net_bind_service`, pour les ports < 1024) ;
  Render retire toutes les capabilities aux conteneurs, et le noyau refuse
  alors d'exécuter ce binaire pour un utilisateur non privilégié (passage non
  root du 2026-09-28). La CI ne l'a pas vu : Docker y garde les capabilities
  par défaut.
- **Reproduit** en local : `docker run --cap-drop ALL --user 33:33` → même
  erreur ; une copie du binaire, sans capability, démarre.
- **Corrigé** : les images hub et démo remplacent le binaire par une copie
  (le port 8000 n'a besoin d'aucun privilège). La CI lance désormais l'image
  de démo avec `--cap-drop ALL --security-opt no-new-privileges`, et compose
  fait de même pour les conteneurs applicatifs : l'écart avec les hébergeurs
  stricts est couvert.

## 2026-09-28 — durcissement : relecture « DevOps, sécurité, full stack »

- **Demande de Michael** : ne pas passer au second POC tant qu'un DevOps, un
  spécialiste sécurité ou un développeur full stack trouverait des défauts.
- **Audit** (mené comme une relecture externe), puis corrigé, testé, poussé :
  1. *Démo publique* : aucun en-tête de sécurité, écritures d'un autre site
     acceptées, corps non bornés, génération de commandes illimitée (mémoire
     d'une instance de 512 Mo), analyse IA sans plafond de coût. → CSP à
     nonce, en-têtes, garde même origine, 16 Kio, limites de fréquence,
     plafond de commandes, budget quotidien du modèle.
  2. *Faux verdict* du contrôle « exactement une fois » au-delà de 5 000
     commandes (lecture tronquée en silence). → refus explicite.
  3. *API du hub sans authentification*, CORS inutile. → jeton de service,
     refus par défaut ; bundle CORS retiré (ADR 0008).
  4. *Comparaisons de secrets non constantes* dans le simulateur. → temps
     constant.
  5. *Conteneurs* : root, secrets de démo fixes, `SIGTERM` ignoré par le
     script (PID 1), conteneur arrêté à chaque remise à zéro, services
     internes à l'écoute sur toutes les interfaces, ports compose publiés
     sur le réseau. → utilisateur numérique non privilégié, secrets
     aléatoires, superviseur (arrêt propre en 2,3 s mesuré en local, remise à
     zéro sur place), 127.0.0.1.
  6. *Chaîne d'approvisionnement* : actions non épinglées, jeton CI en
     écriture par défaut, aucun audit, paquet abandonné (`qossmic/deptrac`),
     npm et ses 8 failles HIGH dans les images d'exécution. → SHA, lecture
     seule, `npm audit`/`composer audit`, Hadolint, ShellCheck, Trivy
     (CRITICAL bloquante, exceptions datées dans `.trivyignore.yaml`),
     CodeQL, Dependabot (sans versions majeures), `deptrac/deptrac`, npm
     retiré.
  7. *Clean Architecture* : l'Application dépendait de DBAL, Messenger, Lock
     et d'une entité Doctrine. → ports et adaptateurs, handlers en
     Infrastructure, `ChannelState` dans le domaine (mapping XML), Deptrac
     durci (ADR 0008).
  8. *Tables sans fin* (journal, dédoublonnage). → rétention horaire par lots.
  9. *Console peu testée en unitaire* (45 % des lignes). → 94 %, frontière
     serveur comprise ; une mutation de la garde est bien détectée.
  10. *Logs de production* inondés de dépréciations tierces. → coupées en
      production, visibles en développement et en CI.
- **Défaut trouvé par la CI en chemin** (run 34) : sous tempête, l'image de
  démo échouait par intermittence (« database is locked » : transaction
  SQLite différée qui lit puis écrit après une écriture concurrente). Les
  runs précédents étaient passés par chance. → middleware DBAL
  `BEGIN IMMEDIATE` + attente de 5 s, test qui reproduit la contention ;
  suite complète verte contre la démo SQLite locale, zéro verrouillage.
- **Accepté et daté** : une faille CRITICAL dans le binaire FrankenPHP amont
  (module OpenAPI non utilisé), jusqu'au 2026-12-31 ou à une image corrigée.
- **Écart constaté une fois, non reproduit** : un passage local de PHPUnit sur
  SQLite a échoué (5 tests) puis dix passages identiques ont réussi ; la CI
  rejoue la suite SQLite à chaque commit.

## 2026-09-28 — hébergement sans abonnement supplémentaire

- **Demande de Michael** : ne pas cumuler les abonnements ; son portfolio est
  déjà sur Vercel.
- **Décision** : la démo vise l'offre gratuite de Render (`plan: free` dans
  `render.yaml`, 512 Mo, 0,1 CPU, mise en veille après 15 min sans visite) ;
  le portfolio reste sur Vercel et renvoie vers la démo (lien, ou
  sous-domaine en `CNAME`). L'image est aussi publiée sur GHCR
  (`ghcr.io/michael-mas/order-hub-demo`, téléchargeable sans compte, vérifié)
  pour tout autre hébergeur.
- **Vérifié plutôt que supposé** : nouveau job CI qui démarre l'image avec
  `--memory=512m --cpus=0.1`, chronomètre le démarrage et y joue la suite de
  la console. Run 30 : sain en **25 s**, 6 tests verts, **187 Mio** sur 512.
- **Reste** (jalon 8) : créer le service depuis le compte Render de Michael
  (Blueprint), puis ajouter le lien sur le portfolio.

## 2026-09-28 — démo hébergeable sans base de données

- **Demande de Michael** : une démo facile à héberger, qui montre ce qu'il
  sait faire, sans base de données réelle ; « Vercel peut-il l'héberger ? »
- **Décision** (ADR 0007) : SQL du hub rendu portable (PostgreSQL et SQLite),
  image unique `docker/demo/` sur SQLite éphémère, seule la console exposée,
  `render.yaml`. Vercel : oui pour la console seule ; non pour le worker, le
  simulateur et le hub (processus continus, stockage partagé).
- **Vérifié** : 99 tests PHPUnit verts sur PostgreSQL et sur SQLite ; la suite
  de bout en bout (13 tests, tempête comprise) verte contre le script de démo
  lancé en natif sur SQLite, sans aucune erreur de verrouillage ; en CI,
  contre l'image elle-même.
- **Mémoire mesurée en natif** (serveur PHP de développement à 5 processus) :
  environ 480 Mo au total, dont console 100 Mo, simulateur 100 Mo, worker
  55 Mo. L'image utilise FrankenPHP (un seul processus) ; mesure du
  conteneur en CI (`docker stats` après les suites, run 28) : **226 Mio**.
  La démo tient dans une offre à 512 Mo.
- **Corrigé en chemin** : identifiants UUID stockés en binaire hors
  PostgreSQL (passés en `guid`) ; filtres `#[ApiFilter]` dépréciés par API
  Platform 4.4 (remplacés par des paramètres de requête) ; limiteurs câblés
  par nom de paramètre, déprécié par Symfony 8.1 (`#[Target]`) ;
  `AGENTS.md` / `CLAUDE.md` générés par `next dev` avaient été commités dans
  `apps/console` (retirés, ignorés).

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
