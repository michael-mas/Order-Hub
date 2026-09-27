<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Application\StoredOrder;
use App\Application\UpsertResult;
use App\Domain\Order\ExternalOrder;
use App\Domain\Order\IngestionOutcome;
use App\Domain\Order\IngestionSource;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Types\Types;
use Symfony\Component\Uid\Uuid;

final readonly class OrderStore implements \App\Application\OrderStore
{
    public function __construct(private Connection $connection)
    {
    }

    /**
     * Two conditional statements decide, each atomic on its own: insert if the
     * order is new, otherwise replace it only with a strictly newer version.
     * Concurrent deliveries of the same order (a webhook and a poll racing)
     * serialize on the unique key, so no version can win twice and no older
     * version can overwrite a newer one. Portable SQL: PostgreSQL and SQLite.
     */
    public function upsert(string $channel, ExternalOrder $order, IngestionSource $source, \DateTimeImmutable $now): UpsertResult
    {
        $values = [
            'channel' => $channel,
            'external_id' => $order->externalId,
            'status' => $order->status,
            'currency' => $order->currency,
            'total_minor' => $order->totalMinor,
            'lines' => $order->linesAsArray(),
            'buyer' => $order->buyerDisplayName,
            'created_at' => $order->createdAt,
            'updated_at' => $order->updatedAt,
            'version' => $order->version,
            'now' => $now,
        ];
        $types = [
            'lines' => Types::JSON,
            'created_at' => Types::DATETIME_IMMUTABLE,
            'updated_at' => Types::DATETIME_IMMUTABLE,
            'now' => Types::DATETIME_IMMUTABLE,
        ];

        $created = $this->connection->fetchOne(
            <<<'SQL'
                INSERT INTO orders (id, channel, external_id, status, currency, total_minor, lines,
                                    buyer_display_name, external_created_at, external_updated_at, version,
                                    first_source, first_seen_at, last_changed_at, acknowledged_at)
                VALUES (:id, :channel, :external_id, :status, :currency, :total_minor, :lines,
                        :buyer, :created_at, :updated_at, :version, :source, :now, :now, NULL)
                ON CONFLICT (channel, external_id) DO NOTHING
                RETURNING id
                SQL,
            $values + ['id' => Uuid::v7()->toRfc4122(), 'source' => $source->value],
            $types,
        );
        if (false !== $created) {
            return new UpsertResult(IngestionOutcome::Created, Row::scalarToString($created), $order->version);
        }

        unset($values['created_at'], $types['created_at']);
        $updated = $this->connection->fetchOne(
            <<<'SQL'
                UPDATE orders SET
                    status = :status,
                    currency = :currency,
                    total_minor = :total_minor,
                    lines = :lines,
                    buyer_display_name = :buyer,
                    external_updated_at = :updated_at,
                    version = :version,
                    last_changed_at = :now
                WHERE channel = :channel AND external_id = :external_id AND version < :version
                RETURNING id
                SQL,
            $values,
            $types,
        );
        if (false !== $updated) {
            return new UpsertResult(IngestionOutcome::Updated, Row::scalarToString($updated), $order->version);
        }

        // Nothing written: the stored version is at least as recent. It only
        // ever grows, so reading it now cannot turn a stale answer into a wrong one.
        $stored = $this->connection->fetchAssociative(
            'SELECT id, version FROM orders WHERE channel = :channel AND external_id = :external_id',
            ['channel' => $channel, 'external_id' => $order->externalId],
        );
        if (false === $stored) {
            throw new \LogicException('An order that blocked the upsert cannot be missing.');
        }
        $storedVersion = Row::int($stored, 'version');

        return new UpsertResult(
            $storedVersion === $order->version ? IngestionOutcome::Unchanged : IngestionOutcome::Stale,
            Row::string($stored, 'id'),
            $storedVersion,
        );
    }

    public function find(string $orderId): ?StoredOrder
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, channel, external_id, acknowledged_at FROM orders WHERE id = :id',
            ['id' => $orderId],
        );

        return false === $row ? null : new StoredOrder(
            Row::string($row, 'id'),
            Row::string($row, 'channel'),
            Row::string($row, 'external_id'),
            null !== $row['acknowledged_at'],
        );
    }

    public function markAcknowledged(string $orderId, \DateTimeImmutable $at): void
    {
        $this->connection->executeStatement(
            'UPDATE orders SET acknowledged_at = :at WHERE id = :id AND acknowledged_at IS NULL',
            ['id' => $orderId, 'at' => $at],
            ['at' => Types::DATETIME_IMMUTABLE],
        );
    }
}
