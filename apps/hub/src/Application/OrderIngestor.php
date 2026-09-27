<?php

declare(strict_types=1);

namespace App\Application;

use App\Application\Message\AcknowledgeOrder;
use App\Domain\Journal\EventType;
use App\Domain\Order\ExternalOrder;
use App\Domain\Order\IngestionOutcome;
use App\Domain\Order\IngestionSource;
use App\Domain\Order\InvalidOrderPayload;
use Doctrine\DBAL\Connection;
use Psr\Clock\ClockInterface;
use Symfony\Component\Messenger\MessageBusInterface;

/**
 * The single entry point for an order version, whatever brought it (webhook,
 * poll, reconciliation). Everything it decides is committed together: the
 * order, the journal entry and the acknowledgement to send.
 */
class OrderIngestor
{
    public function __construct(
        private readonly Connection $connection,
        private readonly OrderStore $orders,
        private readonly Journal $journal,
        private readonly MessageBusInterface $bus,
        private readonly ClockInterface $clock,
    ) {
    }

    /**
     * @param array<mixed> $payload
     *
     * @return IngestionOutcome|null null when the payload is invalid (journaled, never retried)
     */
    public function ingest(string $channel, array $payload, IngestionSource $source, ?string $eventId = null): ?IngestionOutcome
    {
        try {
            $order = ExternalOrder::fromPayload($payload);
        } catch (InvalidOrderPayload $e) {
            $this->journal->record(EventType::OrderInvalid, $e->getMessage(), $channel, [
                'source' => $source->value,
                'event_id' => $eventId,
                'external_id' => \is_string($payload['id'] ?? null) ? $payload['id'] : null,
                'field' => $e->field,
            ]);

            return null;
        }

        return $this->connection->transactional(function () use ($channel, $order, $source, $eventId): IngestionOutcome {
            $result = $this->orders->upsert($channel, $order, $source, $this->clock->now());
            $context = [
                'order_id' => $result->orderId,
                'external_id' => $order->externalId,
                'version' => $order->version,
                'stored_version' => $result->storedVersion,
                'status' => $order->status,
                'source' => $source->value,
                'event_id' => $eventId,
            ];

            match ($result->outcome) {
                IngestionOutcome::Created => $this->created($channel, $order, $result, $context),
                IngestionOutcome::Updated => $this->journal->record(
                    EventType::OrderUpdated,
                    \sprintf('%s moved to "%s" (v%d).', $order->externalId, $order->status, $order->version),
                    $channel,
                    $context,
                ),
                IngestionOutcome::Stale => $this->journal->record(
                    EventType::OrderStale,
                    \sprintf('%s v%d arrived after v%d: ignored.', $order->externalId, $order->version, $result->storedVersion),
                    $channel,
                    $context,
                ),
                // A poll re-reading its overlap sees the same versions on
                // purpose: only a duplicated push is worth a journal line.
                IngestionOutcome::Unchanged => IngestionSource::Webhook === $source
                    ? $this->journal->record(
                        EventType::OrderUnchanged,
                        \sprintf('%s v%d already stored: duplicate ignored.', $order->externalId, $order->version),
                        $channel,
                        $context,
                    )
                    : null,
            };

            return $result->outcome;
        });
    }

    /**
     * @param array<string, scalar|null> $context
     */
    private function created(string $channel, ExternalOrder $order, UpsertResult $result, array $context): void
    {
        $this->journal->record(
            EventType::OrderCreated,
            \sprintf('%s imported (%s, %d line(s)).', $order->externalId, $order->status, \count($order->lines)),
            $channel,
            $context,
        );
        // Same transaction as the order: the Doctrine transport writes the
        // message in the same database, so it cannot be lost or sent twice.
        $this->bus->dispatch(new AcknowledgeOrder($result->orderId, $channel));
    }
}
