<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Types\Types;

final readonly class WebhookEventStore implements \App\Application\WebhookEventStore
{
    public function __construct(private Connection $connection)
    {
    }

    public function remember(string $channel, string $eventId, \DateTimeImmutable $now): bool
    {
        $inserted = $this->connection->executeStatement(
            'INSERT INTO webhook_events (channel, event_id, received_at) VALUES (:channel, :event_id, :now)
             ON CONFLICT DO NOTHING',
            ['channel' => $channel, 'event_id' => $eventId, 'now' => $now],
            ['now' => Types::DATETIME_IMMUTABLE],
        );

        return 1 === $inserted;
    }
}
