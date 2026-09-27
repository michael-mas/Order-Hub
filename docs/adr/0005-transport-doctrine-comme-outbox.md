# 0005 — Le transport Doctrine de Messenger comme outbox

- Statut : accepté (2026-09-27)

## Contexte

Une commande créée doit être acquittée auprès de la marketplace, exactement
une fois. Écrire la commande puis publier un message vers un courtier séparé
laisse une fenêtre où l'un réussit et l'autre non. Le remède habituel est une
table outbox relayée vers le courtier.

## Décision

Messenger utilise le transport Doctrine, dans la base de l'application. Le
message `AcknowledgeOrder` est dispatché à l'intérieur de la transaction qui
écrit la commande et son entrée de journal : la ligne du message est validée
ou annulée avec elles. La file est l'outbox ; aucun relais n'est nécessaire.
Même principe pour la réception des webhooks (événement mémorisé + message
d'ingestion) et pour le rejeu (retrait de la file d'échecs + renvoi).

## Conséquences

- Aucune perte ni duplication entre la base et la file, sans code de relais.
- Débit limité par PostgreSQL : largement suffisant ici. Passer à RabbitMQ
  imposerait une vraie table outbox et son relais ; la frontière est un seul
  endroit (`OrderIngestor`).
- L'accusé de réception reste idempotent côté marketplace, parce qu'un
  worker peut mourir entre l'appel et l'acquittement du message.
