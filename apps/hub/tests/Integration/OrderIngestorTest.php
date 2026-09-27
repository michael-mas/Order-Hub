<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Application\Message\AcknowledgeOrder;
use App\Application\OrderIngestor;
use App\Domain\Order\IngestionOutcome;
use App\Domain\Order\IngestionSource;
use App\Infrastructure\Persistence\Row;
use App\Tests\Support\Orders;

final class OrderIngestorTest extends DatabaseTestCase
{
    private OrderIngestor $ingestor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ingestor = self::service(OrderIngestor::class);
    }

    public function testCreatesTheOrderAndQueuesExactlyOneAcknowledgement(): void
    {
        $outcome = $this->ingestor->ingest('nova', Orders::payload('NOVA-000001'), IngestionSource::Webhook, 'evt_1');

        self::assertSame(IngestionOutcome::Created, $outcome);
        $row = $this->storedOrder('nova', 'NOVA-000001');
        self::assertIsArray($row);
        self::assertSame('webhook', $row['first_source']);
        self::assertSame(1, Row::int($row, 'version'));
        $queued = $this->queued();
        self::assertCount(1, $queued);
        self::assertInstanceOf(AcknowledgeOrder::class, $queued[0]);
        self::assertSame($row['id'], $queued[0]->orderId);
        self::assertSame('nova', $queued[0]->channel);
        self::assertSame(['order.created'], $this->journalTypes());
    }

    public function testTheHighestVersionWinsWhateverTheArrivalOrder(): void
    {
        $this->ingestor->ingest('nova', Orders::payload('NOVA-000001', 1), IngestionSource::Poll);
        self::assertSame(IngestionOutcome::Updated, $this->ingestor->ingest('nova', Orders::payload('NOVA-000001', 3, 'shipped'), IngestionSource::Webhook));
        self::assertSame(IngestionOutcome::Stale, $this->ingestor->ingest('nova', Orders::payload('NOVA-000001', 2, 'accepted'), IngestionSource::Webhook));
        self::assertSame(IngestionOutcome::Unchanged, $this->ingestor->ingest('nova', Orders::payload('NOVA-000001', 3, 'shipped'), IngestionSource::Poll));

        $row = $this->storedOrder('nova', 'NOVA-000001');
        self::assertIsArray($row);
        self::assertSame('shipped', $row['status']);
        self::assertSame(3, Row::int($row, 'version'));
        self::assertSame('poll', $row['first_source']);
        self::assertCount(1, $this->queued(), 'Only the creation queues an acknowledgement.');
        self::assertSame(['order.created', 'order.updated', 'order.stale_ignored'], $this->journalTypes());
    }

    public function testAnOverlappingPollIsSilentButADuplicatedWebhookIsJournaled(): void
    {
        $this->ingestor->ingest('atlas', Orders::payload('ATLS-000001'), IngestionSource::Poll);
        $this->ingestor->ingest('atlas', Orders::payload('ATLS-000001'), IngestionSource::Poll);
        $this->ingestor->ingest('atlas', Orders::payload('ATLS-000001'), IngestionSource::Webhook);

        self::assertSame(['order.created', 'order.duplicate_ignored'], $this->journalTypes());
    }

    public function testTheSameExternalIdOnTwoChannelsIsTwoOrders(): void
    {
        $this->ingestor->ingest('nova', Orders::payload('X-1'), IngestionSource::Poll);
        $this->ingestor->ingest('atlas', Orders::payload('X-1'), IngestionSource::Poll);

        self::assertSame(2, Row::int(['n' => $this->connection->fetchOne('SELECT COUNT(*) FROM orders')], 'n'));
    }

    public function testAnInvalidPayloadIsJournaledAndNeverStored(): void
    {
        $outcome = $this->ingestor->ingest('nova', Orders::payload(overrides: ['total_minor' => 1]), IngestionSource::Webhook, 'evt_9');

        self::assertNull($outcome);
        self::assertSame(0, Row::int(['n' => $this->connection->fetchOne('SELECT COUNT(*) FROM orders')], 'n'));
        self::assertSame(['order.invalid_payload'], $this->journalTypes());
        self::assertSame([], $this->queued());
    }
}
