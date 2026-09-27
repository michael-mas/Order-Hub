# 0007 — Une démo autonome sur SQLite éphémère

- Statut : accepté (2026-09-28)

## Contexte

Le projet doit servir de démonstration publique, facile à héberger, sans base
de données réelle à provisionner, à sécuriser ou à payer. Les fonctions
serverless (Vercel, par exemple) ne conviennent pas au cœur du système : le
worker Messenger et le simulateur tournent en continu, et le hub a besoin
d'un stockage partagé entre ses requêtes.

## Décision

- Le hub accepte PostgreSQL (déploiement) **et** SQLite (démo). Le SQL écrit
  à la main est portable : upsert en deux instructions conditionnelles au lieu
  de `xmax`, `ON CONFLICT`, `RETURNING`, `FILTER` ; identifiants de commande
  en `guid` (UUID natif sous PostgreSQL, texte sous SQLite).
- Une image unique (`docker/demo/`) lance le hub (FrankenPHP), le worker, le
  simulateur et la console. La base SQLite (mode WAL) est recréée à chaque
  démarrage, comme l'état du simulateur : les deux repartent ensemble, et au
  plus tard toutes les 24 h pour borner la mémoire du simulateur.
- Seule la console est exposée ; le reste écoute en local.
- Les migrations restent la voie PostgreSQL ; la démo crée son schéma avec
  `doctrine:schema:create`.

## Conséquences

- Hébergement en une étape sur n'importe quel hôte de conteneurs ;
  `render.yaml` pour Render, sur son offre gratuite ; image publiée sur GHCR.
- La tenue dans une petite instance gratuite (512 Mo, 0,1 CPU) est vérifiée
  en CI à chaque commit.
- La portabilité est prouvée, pas supposée : la suite PHPUnit tourne sur les
  deux bases en CI, et la suite de bout en bout (tempête comprise) tourne
  contre l'image de démo.
- Les données de la démo sont perdues à chaque redémarrage : c'est voulu.
- SQLite sérialise les écritures : suffisant pour une démo, pas pour de la
  production ; PostgreSQL reste la cible de `compose.yaml`.
