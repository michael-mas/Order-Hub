# Simulateur de marketplace

Deux places de marché fictives qui se comportent comme les vraies un mauvais
jour. Le hub s'entraîne contre elles ; la console règle leurs pannes.

- **`nova`** (préfixe `NOVA-`) : API + webhooks signés vers `<HUB_URL>/webhooks/nova`.
- **`atlas`** (préfixe `ATLS-`) : API seule ; le hub doit interroger.

Aucune donnée personnelle : acheteurs pseudonymes (`Buyer 0412`), catalogue
générique, montants en centimes.

## Lancer

```bash
npm run dev      # rechargement à chaud, port 8100
npm run start
npm run verify   # typecheck + lint + tests
```

| Variable              | Rôle                                                        | Défaut                     |
| --------------------- | ----------------------------------------------------------- | -------------------------- |
| `PORT`                | port HTTP                                                   | `8100`                     |
| `HUB_URL`             | base des webhooks (`<HUB_URL>/webhooks/<code>`)             | `http://localhost:8000`    |
| `SIMULATOR_SEED`      | graine de tout l'aléatoire                                  | `20260926`                 |
| `NOVA_API_KEY`        | clé d'API de `nova`                                         | `nova-demo-key`            |
| `NOVA_WEBHOOK_SECRET` | secret de signature des webhooks de `nova`                  | `nova-demo-webhook-secret` |
| `ATLAS_API_KEY`       | clé d'API d'`atlas`                                         | `atlas-demo-key`           |
| `CONTROL_TOKEN`       | si défini, exigé dans `x-control-token` sur `/control/*`    | aucun                      |

## API publique (ce que voit le hub)

Authentification : `Authorization: Bearer <clé du canal>`. Chaque appel consomme
un jeton du forfait ; au-delà, `429` avec `Retry-After` (secondes).
En-tête `x-ratelimit-remaining` sur les réponses servies.

| Méthode | Route                                             | Réponse                                                        |
| ------- | ------------------------------------------------- | -------------------------------------------------------------- |
| `GET`   | `/v1/{code}/orders?updated_since=&limit=&page_token=` | `{ orders, next_page_token }` — tri `(updated_at, id)`, pagination par curseur opaque, `limit` ≤ 100 |
| `GET`   | `/v1/{code}/orders/{id}`                          | la commande, ou `404` tant qu'elle n'est pas visible            |
| `POST`  | `/v1/{code}/orders/{id}/acknowledgements`         | `{ merchant_order_ref }` → `201` ; même référence → `200` ; autre référence → `409` |

Erreurs : `{ "error": { "code", "message" } }`.

Commande :

```json
{
  "id": "NOVA-000042",
  "status": "new | accepted | shipped | cancelled",
  "currency": "EUR",
  "total_minor": 4470,
  "lines": [{ "sku": "MUG-CER-350", "title": "Ceramic mug 350 ml", "quantity": 3, "unit_price_minor": 1490 }],
  "buyer": { "display_name": "Buyer 0412" },
  "created_at": "2026-09-26T10:00:00.000Z",
  "updated_at": "2026-09-26T10:04:12.000Z",
  "version": 2
}
```

`version` augmente à chaque changement : c'est la seule façon sûre d'ordonner
des mises à jour arrivées dans le désordre.

## Webhooks (`nova`)

`POST <HUB_URL>/webhooks/nova`, corps :

```json
{ "event_id": "evt_nova_00000042", "type": "order.created | order.updated",
  "occurred_at": "…", "marketplace": "nova", "order": { … } }
```

En-têtes :

- `x-marketplace-event-id` : identique à `event_id` (et identique sur un doublon) ;
- `x-marketplace-signature` : `t=<secondes unix>,v1=<hex HMAC-SHA256("<t>.<corps brut>")>`.

Le récepteur doit vérifier la signature sur le **corps brut**, refuser un
horodatage à plus de 5 minutes, et répondre `2xx` vite. Toute autre réponse
déclenche des reprises : 1 s, 2 s, 4 s, puis abandon après 4 tentatives.

## Plan de contrôle

| Méthode | Route                                         | Rôle                                                   |
| ------- | --------------------------------------------- | ------------------------------------------------------ |
| `GET`   | `/control/marketplaces`                       | état, pannes et compteurs des deux canaux              |
| `GET`   | `/control/marketplaces/{code}`                | idem pour un canal                                     |
| `PATCH` | `/control/marketplaces/{code}/chaos`          | modification partielle, validée en entier              |
| `PUT`   | `/control/marketplaces/{code}/preset/{name}`  | `calm`, `busy` ou `storm`                              |
| `POST`  | `/control/marketplaces/{code}/generate`       | `{ orders?, updates? }` : génère immédiatement         |
| `GET`   | `/control/marketplaces/{code}/orders`         | **vérité terrain** : toutes les commandes et leurs accusés |
| `POST`  | `/control/reset`                              | retour à l'état initial de la graine                   |

Configuration des pannes :

```json
{
  "errorRate": 0.05,
  "latencyMs": { "min": 100, "max": 600 },
  "rateLimit": { "capacity": 5, "refillPerSecond": 1 },
  "visibilityDelayMaxMs": 8000,
  "webhooks": { "dropRate": 0.1, "duplicateRate": 0.2, "maxDelayMs": 3000 },
  "generation": { "ordersPerMinute": 60, "updatesPerMinute": 60 }
}
```

## Déterminisme

Trois flux aléatoires distincts, tous dérivés de la graine : contenu des
commandes, pannes des webhooks et de visibilité, pannes de l'API. Régler une
panne ne décale donc jamais les commandes générées — un test le vérifie.
`Math.random` est interdit par le lint.

## Tests

- `test/primitives.test.ts` — PRNG, seau de jetons, signature (propriétés fast-check)
- `test/orders.test.ts` — pagination exhaustive et sans doublon (propriété), versions, cohérence à terme, accusés idempotents
- `test/webhooks.test.ts` — signature vérifiable, pertes, doublons, backoff, abandon
- `test/app.test.ts` — HTTP : authentification, quota et `Retry-After`, erreurs injectées, plan de contrôle, graine
