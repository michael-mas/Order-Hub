<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Application\RetentionStore;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Types\Types;

/**
 * Deletes by batches through the time indexes, so a large backlog never holds
 * one long transaction. Plain SQL, the same on PostgreSQL and SQLite.
 */
final readonly class DbalRetentionStore implements RetentionStore
{
    public const int BATCH = 5000;

    public function __construct(private Connection $connection)
    {
    }

    public function deleteJournalBefore(\DateTimeImmutable $cutoff): int
    {
        return $this->deleteInBatches(
            'DELETE FROM journal WHERE id IN (SELECT id FROM journal WHERE occurred_at < :cutoff ORDER BY id LIMIT '.self::BATCH.')',
            $cutoff,
        );
    }

    public function deleteWebhookEventsBefore(\DateTimeImmutable $cutoff): int
    {
        // Composite key: SQLite has no row-value IN, so the batch goes by timestamp.
        return $this->deleteInBatches(
            'DELETE FROM webhook_events WHERE received_at IN (SELECT received_at FROM webhook_events WHERE received_at < :cutoff ORDER BY received_at LIMIT '.self::BATCH.')',
            $cutoff,
        );
    }

    private function deleteInBatches(string $sql, \DateTimeImmutable $cutoff): int
    {
        $total = 0;
        do {
            // A row count: DBAL types it int|numeric-string for very large counts.
            $deleted = (int) $this->connection->executeStatement($sql, ['cutoff' => $cutoff], ['cutoff' => Types::DATETIME_IMMUTABLE]);
            $total += $deleted;
        } while ($deleted > 0);

        return $total;
    }
}
