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
     * One statement decides: insert, replace with a strictly newer version, or
     * leave untouched. Concurrent deliveries of the same order (a webhook and a
     * poll racing) serialize on the unique key, so no version can win twice
     * and no older version can overwrite a newer one.
     */
    public function upsert(string $channel, ExternalOrder $order, IngestionSource $source, \DateTimeImmutable $now): UpsertResult
    {
        $row = $this->connection->fetchAssociative(
            <<<'SQL'
                INSERT INTO orders (id, channel, external_id, status, currency, total_minor, lines,
                                    buyer_display_name, external_created_at, external_updated_at, version,
                                    first_source, first_seen_at, last_changed_at, acknowledged_at)
                VALUES (:id, :channel, :external_id, :status, :currency, :total_minor, :lines,
                        :buyer, :created_at, :updated_at, :version, :source, :now, :now, NULL)
                ON CONFLICT (channel, external_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    currency = EXCLUDED.currency,
                    total_minor = EXCLUDED.total_minor,
                    lines = EXCLUDED.lines,
                    buyer_display_name = EXCLUDED.buyer_display_name,
                    external_updated_at = EXCLUDED.external_updated_at,
                    version = EXCLUDED.version,
                    last_changed_at = EXCLUDED.last_changed_at
                WHERE orders.version < EXCLUDED.version
                RETURNING id, (xmax = 0) AS inserted
                SQL,
            [
                'id' => Uuid::v7()->toRfc4122(),
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
                'source' => $source->value,
                'now' => $now,
            ],
            [
                'lines' => Types::JSON,
                'created_at' => Types::DATETIME_IMMUTABLE,
                'updated_at' => Types::DATETIME_IMMUTABLE,
                'now' => Types::DATETIME_IMMUTABLE,
            ],
        );

        if (false !== $row) {
            $outcome = true === $row['inserted'] || 't' === $row['inserted'] || 1 === $row['inserted']
                ? IngestionOutcome::Created
                : IngestionOutcome::Updated;

            return new UpsertResult($outcome, Row::string($row, 'id'), $order->version);
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
