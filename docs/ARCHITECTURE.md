# Architecture

> Ce document distingue ce qui **existe** de ce qui est **prévu**. Il est mis à
> jour à chaque jalon.

## Vue d'ensemble

| Service       | Techno                                    | Port  | État         |
| ------------- | ----------------------------------------- | ----- | ------------ |
| `marketplace` | Node 22, TypeScript, Hono, zod            | 8100  | existe       |
| `hub`         | PHP 8.4, Symfony 8.1, API Platform 4, Doctrine, Messenger | 8000 | squelette |
| `console`     | Next.js, React, TypeScript                | 3000  | prévu        |
| PostgreSQL    | 16                                        | 5432  | prévu (hub)  |

## Garanties visées par le hub

1. **Exactement une fois, en effet.** Une commande reçue plusieurs fois (webhook
   dupliqué, webhook + polling, rejeu) n'est enregistrée et acquittée qu'une fois.
   Moyens : identifiant d'événement unique (table de déduplication, contrainte
   d'unicité), clé naturelle `(canal, id externe)`, accusé de réception
   idempotent côté marketplace.
2. **Dernière version gagnante.** Une mise à jour plus ancienne que celle
   stockée est ignorée et journalisée — jamais appliquée. Moyen : comparaison
   de `version`, pas de l'heure d'arrivée.
3. **Rien de perdu.** Un webhook perdu est retrouvé par le polling ; une
   commande visible en retard est retrouvée par le **recouvrement** de fenêtre
   (on relit un peu avant le dernier point atteint) et par un rattrapage
   périodique plus large. C'est la même approche que « fenêtre courte et
   fréquente + filet de sécurité quotidien ».
4. **Aucun effet de bord perdu.** L'accusé de réception à envoyer est écrit
   dans une **outbox** dans la même transaction que la commande, puis relayé
   vers Messenger. Un échec est repris avec backoff, puis placé dans une file
   d'échecs rejouable depuis la console.
5. **Quota respecté.** Le hub limite ses propres appels par canal (seau de
   jetons local) et, sur `429`, suspend le canal jusqu'à l'échéance de
   `Retry-After` au lieu d'insister.
6. **Observable.** Chaque décision produit un événement de journal
   (importée, doublon ignoré, version périmée, quota atteint, reprise, échec)
   avec un identifiant de corrélation ; la console les affiche en direct.

## Flux prévus

### Webhook (`nova`)

```
POST /webhooks/nova
  → vérifier la signature sur le corps brut (HMAC-SHA256, ±5 min)   sinon 401
  → insérer event_id (unique)                                        doublon → 200 + journal
  → publier IngestOrder(order) sur le bus                            → 202
worker : IngestOrder
  → upsert si version > version stockée                               sinon journal « périmée »
  → même transaction : outbox AcknowledgeOrder
```

### Polling (`atlas`, et rattrapage de `nova`)

```
planificateur (toutes les N s) → PollChannel(canal)
  → canal suspendu (Retry-After) ?                                   → rien
  → fenêtre = [curseur − recouvrement, maintenant]
  → pages successives, un jeton local par appel
  → chaque commande → même chemin qu'IngestOrder
  → 429 → suspendre jusqu'à Retry-After, journal
  → curseur avancé seulement après la dernière page
```

### Analyste d'incidents IA

```
POST /api/incident-analyses
  → contexte : N derniers événements d'avertissement/erreur, état des canaux,
    taille de la file d'échecs
  → Claude, sortie structurée (JSON Schema) :
      résumé, gravité, constats[{ titre, explication, preuves: [id d'événement] }],
      recommandations[{ action ∈ liste fermée, canal?, justification }]
  → preuves filtrées : seules les références présentes dans le contexte restent
  → sans clé d'API : moteur de règles, même format
  → aucune action n'est exécutée par l'analyste ; un humain la déclenche
```

Actions de la liste fermée : rejouer les échecs, suspendre / reprendre un canal,
réduire la cadence de polling, lancer un rattrapage, ne rien faire.

## Contrat du simulateur

Voir [`apps/marketplace/README.md`](../apps/marketplace/README.md) : routes,
format des commandes, signature des webhooks, plan de contrôle.
