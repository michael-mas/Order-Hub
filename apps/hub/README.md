# Hub

Le cœur d'Order Hub : Symfony 8.1, API Platform 4, Doctrine, Messenger,
PostgreSQL 16. Il reçoit, déduplique, ordonne, stocke et acquitte les
commandes, et journalise chacune de ses décisions.

## Organisation

```
src/Domain/          règles pures, sans framework (vérifié par Deptrac)
  Channel/           canaux, fenêtre de polling
  Order/             validation du format marketplace, issues d'ingestion
  Webhook/           signature HMAC (t=…,v1=…)
  Journal/           types d'événements et gravité
  Incident/          analyse d'incident, filtre des preuves, moteur de règles
src/Application/     cas d'usage : ingestion, réception de webhook, polling,
                     accusés de réception, opérations, analyse ; ports
src/Infrastructure/  PostgreSQL (DBAL), client HTTP marketplace, limiteur
                     de débit, Messenger (file d'échecs, planification), Claude
src/Controller/      contrôleurs fins
src/Entity/          modèle de lecture (API Platform) et état des canaux
```

## Processus

| Processus | Commande                                                   |
| --------- | ---------------------------------------------------------- |
| API       | serveur web sur `public/` (FrankenPHP dans l'image)        |
| Worker    | `bin/console messenger:consume async scheduler_default`    |

Le worker consomme la file `async` (ingestion des webhooks, accusés de
réception, polling à la demande) et le planificateur : polling de `atlas`
toutes les 5 s, de `nova` toutes les 30 s (filet de sécurité derrière les
webhooks), rattrapage des 15 dernières minutes toutes les 2 min.

## API

| Méthode | Route                                   | Rôle                                                              |
| ------- | --------------------------------------- | ----------------------------------------------------------------- |
| `POST`  | `/webhooks/{channel}`                   | `202` accepté, `200` doublon, `401` signature, `422` invalide     |
| `GET`   | `/api/orders`, `/api/orders/{id}`       | commandes (API Platform : filtres `channel`, `status`, tri, pagination) |
| `GET`   | `/api/journal?after=&limit=&min_severity=&channel=` | journal ; `after` pour suivre en direct              |
| `GET`   | `/api/channels`                         | état de chaque canal                                              |
| `POST`  | `/api/channels/{code}/pause·resume·reconcile` | opérations                                                  |
| `GET`   | `/api/failed-messages`                  | file d'échecs                                                     |
| `POST`  | `/api/failed-messages/{id}/replay`, `/api/failed-messages/replay` | rejeu                                   |
| `GET`   | `/api/overview`                         | synthèse des 15 dernières minutes                                 |
| `POST`  | `/api/incident-analyses`                | analyse d'incident                                                |
| `POST`  | `/api/incident-analyses/actions`        | exécute une action de la liste fermée (déclenchée par un humain)  |
| `GET`   | `/health`                               | santé (base de données comprise)                                  |

## Configuration

| Variable                | Rôle                                               | Défaut (`.env`)                 |
| ----------------------- | -------------------------------------------------- | ------------------------------- |
| `DATABASE_URL`          | PostgreSQL                                         | `app:app@127.0.0.1:5432/app`    |
| `MARKETPLACE_BASE_URL`  | le simulateur                                      | `http://127.0.0.1:8100`         |
| `NOVA_API_KEY`, `NOVA_WEBHOOK_SECRET`, `ATLAS_API_KEY` | secrets des canaux  | valeurs de démonstration        |
| `ANTHROPIC_API_KEY`     | vide : moteur de règles ; défini : Claude          | vide                            |
| `ANTHROPIC_MODEL`       | modèle de l'analyste                               | `claude-opus-5`                 |

Quotas locaux par canal : `config/packages/order_hub.yaml`.

## Vérifications

```bash
composer install
vendor/bin/php-cs-fixer fix --dry-run --diff
vendor/bin/phpstan analyse
vendor/bin/deptrac analyse
bin/console doctrine:database:create --env=test
bin/console doctrine:migrations:migrate --env=test -n
vendor/bin/phpunit                       # suites unit, integration, functional
```

Les tests d'intégration et HTTP tournent sur PostgreSQL réel, chacun dans une
transaction annulée. Horloge, marketplace, limiteur et modèle sont remplacés
par des doublures en environnement de test (`config/services_test.yaml`) :
aucun test n'attend ni n'appelle le réseau.
