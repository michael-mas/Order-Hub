<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Application\Journal;
use App\Domain\Journal\EventType;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Types\Types;
use Psr\Clock\ClockInterface;

final readonly class DbalJournal implements Journal
{
    public function __construct(
        private Connection $connection,
        private ClockInterface $clock,
    ) {
    }

    public function record(EventType $type, string $message, ?string $channel = null, array $context = []): string
    {
        $id = $this->connection->fetchOne(
            'INSERT INTO journal (occurred_at, channel, type, severity, message, context)
             VALUES (:occurred_at, :channel, :type, :severity, :message, :context)
             RETURNING id',
            [
                'occurred_at' => $this->clock->now(),
                'channel' => $channel,
                'type' => $type->value,
                'severity' => $type->severity()->value,
                'message' => $message,
                'context' => $context,
            ],
            [
                'occurred_at' => Types::DATETIME_IMMUTABLE,
                'context' => Types::JSON,
            ],
        );

        return Row::scalarToString($id);
    }
}
