# 0008 — Couches strictes et frontières de confiance

- Statut : accepté (2026-09-28)

## Contexte

Une relecture exigeante du POC (développeur, DevOps, sécurité) relevait deux
faiblesses. La couche Application dépendait du framework : transactions
Doctrine, bus et exceptions Messenger, verrous Symfony, et une entité
annotée Doctrine. L'API du hub, elle, n'avait aucune authentification.

## Décision

**Couches.** Deptrac impose désormais :

| Couche           | Peut dépendre de                                  |
| ---------------- | ------------------------------------------------- |
| `Domain`         | rien                                              |
| `Application`    | `Domain`                                          |
| `Entity`         | le framework (modèles de lecture API Platform)    |
| `Infrastructure` | tout                                              |
| `Controller`     | `Application`, `Domain`, le framework             |

- Les cas d'usage passent par des ports : `Transactions`,
  `MessageDispatcher`, `Locks`, `JournalReader`, `ModelBudget`… ; leurs
  adaptateurs vivent dans `Infrastructure` (DBAL, Messenger, Lock,
  RateLimiter).
- Les handlers Messenger sont des adaptateurs : ils traduisent
  `TryAgainLater` (attendre sans consommer de reprise) et `CannotSucceed`
  (file d'échecs) dans la sémantique de Messenger. L'accusé de réception
  est le cas d'usage `OrderAcknowledger`.
- `ChannelState` est une classe du domaine, sans attribut : son mapping
  Doctrine est en XML (`config/doctrine/`). Même table, schéma vérifié en
  CI (`doctrine:schema:validate`).
- L'atomicité de l'ADR 0005 est inchangée : `DbalTransactions` et le
  transport Messenger partagent la même connexion.

**Frontières de confiance.**

- L'API du hub exige un jeton de service (`HUB_API_TOKEN`), que seule la
  console connaît, côté serveur. Un écouteur `kernel.request` le compare en
  temps constant et refuse tout si aucun jeton n'est configuré. Il n'y a ni
  utilisateurs, ni rôles, ni session : le pare-feu de SecurityBundle
  n'apporterait qu'une dépendance de plus pour un `hash_equals`.
- Webhooks : HMAC (ADR 0003). Plan de contrôle du simulateur : jeton comparé
  en temps constant.
- Console publique : CSP à nonce, écritures d'un autre site refusées, corps
  bornés, limites de fréquence ; budget quotidien d'appels au modèle côté
  hub. Le détail est dans [`SECURITY.md`](../../SECURITY.md).

## Conséquences

- Un cas d'usage se teste et se lit sans connaître Symfony ; changer de file
  ou de verrou ne touche que `Infrastructure`.
- Une classe de plus par port, et un fichier de mapping XML à tenir aligné
  avec `ChannelState` (la CI le vérifie).
- Tout appel à l'API du hub, outils compris, doit porter le jeton ; la
  description OpenAPI et `/health` restent publiques.
