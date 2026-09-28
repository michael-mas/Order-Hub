# Architecture

## Services

| Service       | Pile                                                      | Port | Rôle                                                  |
| ------------- | --------------------------------------------------------- | ---- | ----------------------------------------------------- |
| `marketplace` | Node 22, TypeScript, Hono, zod                            | 8100 | deux marketplaces simulées, pannes réglables          |
| `hub`         | PHP 8.4, Symfony 8.1, API Platform 4, Doctrine, Messenger | 8000 | API : webhooks, commandes, journal, opérations        |
| `worker`      | même image que `hub`                                      | —    | file `async` et planificateur                         |
| `console`     | Next.js 16, React 19                                      | 3000 | salle de contrôle ; proxy serveur vers hub et simulateur |
| `postgres`    | PostgreSQL 16                                             | 5432 | commandes, journal, file de messages, quotas          |

La démo publique réunit ces services dans une seule image, sur un fichier
SQLite éphémère au lieu de PostgreSQL ; seule la console y est exposée
(ADR 0007, `docker/demo/`).

## Couches du hub (ADR 0008)

```
Controller ──► Application ──► Domain
                   ▲
Infrastructure ────┘  (adaptateurs des ports : DBAL, Messenger, Lock,
                       RateLimiter, HTTP, Claude)
```

Le domaine ne dépend de rien ; les cas d'usage ne connaissent que le domaine
et leurs ports (`Transactions`, `MessageDispatcher`, `Locks`, `JournalReader`,
`ModelBudget`…). Les handlers Messenger sont des adaptateurs. Deptrac le vérifie
en CI.

## Frontières de confiance

| Appelant            | Porte                                   | Contrôle                                        |
| ------------------- | --------------------------------------- | ----------------------------------------------- |
| navigateur          | console (`/`, `/api/...`)               | CSP à nonce, liste blanche, même origine, 16 Kio, limites de fréquence |
| console             | hub `/api/...`                          | jeton de service, temps constant, refus par défaut |
| marketplace         | hub `/webhooks/{canal}`                 | HMAC sur le corps brut, horodatage signé        |
| console, tests      | simulateur `/control/...`               | jeton de contrôle, temps constant               |

Détail et limites : [`SECURITY.md`](../SECURITY.md).

## Garanties et mécanismes

1. **Exactement une fois, en effet.** Un événement webhook déjà vu (clé
   `(canal, event_id)`) est répondu `200` et ignoré. Une commande a une clé
   naturelle `(canal, id externe)`. L'accusé de réception envoie l'UUID du hub
   comme référence : un renvoi obtient `200` (« déjà fait ») et compte comme
   un succès ; une autre référence obtient `409` et part dans la file
   d'échecs pour un humain.
2. **Dernière version gagnante.** Une seule instruction décide :
   `INSERT … ON CONFLICT (channel, external_id) DO UPDATE … WHERE
   orders.version < EXCLUDED.version`. Deux livraisons concurrentes de la
   même commande se sérialisent sur la clé unique ; l'heure d'arrivée ne
   compte jamais.
3. **Rien de perdu.** Les webhooks apportent la fraîcheur, le polling la
   complétude (ADR 0003). Chaque poll relit un recouvrement de 30 s derrière
   son point de reprise, pour les commandes que la marketplace liste en
   retard ; un rattrapage balaie les 15 dernières minutes toutes les 2 min.
4. **Progrès sous quota.** Le point de reprise avance après chaque page, sur
   le `updated_at` des commandes lues (horloge de la marketplace) ; le
   rattrapage garde son propre point de reprise. Un arriéré plus grand qu'une
   rafale de quota se résorbe donc poll après poll (ADR 0006).
5. **Effets de bord atomiques.** Le transport Messenger est Doctrine, dans la
   même base : l'accusé de réception à envoyer est écrit dans la transaction
   de la commande et de son entrée de journal. Tout est validé, ou rien
   (ADR 0005).
6. **Quota respecté.** Chaque appel consomme d'abord un jeton local (seau de
   jetons par canal, partagé par les workers via la base). Sur `429`, le
   canal est suspendu jusqu'à l'échéance de `Retry-After` ; les accusés de
   réception attendent sans consommer leurs reprises.
7. **Échecs visibles.** Une erreur de la marketplace est reprise avec backoff
   (1 s, 3 s, 9 s, 27 s), puis le message rejoint la file d'échecs, listable et
   rejouable depuis la console ; le rejeu retire et renvoie le message dans la
   même transaction.
8. **Observable.** Chaque décision écrit une entrée de journal dans sa propre
   transaction : commande créée, mise à jour, doublon, version périmée,
   webhook refusé, quota, reprise, échec, rejeu, opération manuelle, analyse.
   Les logs techniques sortent en JSON sur la sortie d'erreur.
9. **Borné.** Toutes les heures, la rétention supprime par lots le journal au
   delà de 30 jours et les identifiants de webhooks au-delà de 7 jours ; les
   commandes restent. Sous SQLite, les transactions d'écriture prennent le
   verrou dès leur début (`BEGIN IMMEDIATE`) : sous charge, les écrivains
   attendent leur tour au lieu d'échouer.

## Flux

### Webhook (`nova`)

```
POST /webhooks/nova
  → signature vérifiée sur le corps brut (HMAC-SHA256, ± 5 min)          sinon 401 + journal
  → event_id cohérent avec l'en-tête, commande valide                     sinon 422 + journal
  → transaction : INSERT webhook_events (unique) ; message IngestOrder    doublon → 200 + journal
  → 202
worker : IngestOrder → OrderIngestor (ci-dessous)
```

### Polling (`atlas` toutes les 5 s, `nova` toutes les 30 s, rattrapage 2 min)

```
PollChannel(canal, mode)
  → verrou par canal ; canal en pause ou suspendu → rien
  → since = point de reprise − 30 s   (rattrapage : reprise du balayage, ou maintenant − 15 min)
  → par page : jeton local ? sinon arrêt « partiel » (reprise au prochain tick)
               429 → suspension Retry-After ; 5xx → arrêt « échec »
               chaque commande → OrderIngestor ; point de reprise = dernier updated_at lu
  → rattrapage terminé → le prochain balaie à nouveau toute la fenêtre
```

### Ingestion

```
OrderIngestor(canal, payload, source)
  → validation stricte (identifiant, statut, devise, lignes, total recalculé, dates, version)
  → transaction :
       upsert atomique → créée | mise à jour | inchangée | périmée
       entrée de journal
       si créée : message AcknowledgeOrder
```

### Analyste d'incidents

```
POST /api/incident-analyses
  → contexte : 120 dernières entrées non routinières sur 30 min (avec identifiants),
    comptage de toutes les entrées par type, état des canaux, taille de la file d'échecs
  → Claude (sortie JSON Schema) si une clé est configurée, sinon moteur de règles ;
    en cas d'échec du modèle, moteur de règles avec la raison
  → filtre : preuves absentes du contexte retirées, constats sans preuve retirés,
    actions impossibles retirées (canal inconnu, rien à rejouer), doublons retirés
  → journal « analysis.produced »
POST /api/incident-analyses/actions  → seulement les actions de la liste fermée, déclenchées par un humain
```

## Modèle de données

Identique sur PostgreSQL et SQLite (schéma par les migrations ou par
`doctrine:schema:create`).

| Table              | Contenu                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `orders`           | dernière version de chaque commande ; unique `(channel, external_id)`   |
| `webhook_events`   | un enregistrement par `(channel, event_id)` accepté                     |
| `journal`          | décisions, append-only, identifiant croissant                           |
| `channel_states`   | point de reprise, rattrapage en cours, suspension, pause, dernier poll  |
| `messenger_messages` | files `async` et `failed`                                             |
| `cache_items`      | seaux de jetons des quotas locaux                                       |

## Contrat du simulateur

Voir [`apps/marketplace/README.md`](../apps/marketplace/README.md).
