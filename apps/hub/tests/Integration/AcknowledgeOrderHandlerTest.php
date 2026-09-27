<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Application\AcknowledgementResult;
use App\Application\ChannelStates;
use App\Application\Handler\AcknowledgeOrderHandler;
use App\Application\MarketplaceUnavailable;
use App\Application\Message\AcknowledgeOrder;
use App\Application\OrderIngestor;
use App\Domain\Order\IngestionSource;
use App\Infrastructure\Persistence\Row;
use App\Tests\Support\FakeMarketplace;
use App\Tests\Support\Orders;
use Symfony\Component\Messenger\Exception\RecoverableMessageHandlingException;
use Symfony\Component\Messenger\Exception\UnrecoverableMessageHandlingException;

final class AcknowledgeOrderHandlerTest extends DatabaseTestCase
{
    private AcknowledgeOrderHandler $handler;
    private string $orderId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->handler = self::service(AcknowledgeOrderHandler::class);
        self::service(OrderIngestor::class)->ingest('atlas', Orders::payload('ATLS-000001'), IngestionSource::Poll);
        $row = $this->storedOrder('atlas', 'ATLS-000001');
        \assert(\is_array($row));
        $this->orderId = Row::string($row, 'id');
    }

    public function testAcknowledgesWithTheHubReferenceOnce(): void
    {
        ($this->handler)(new AcknowledgeOrder($this->orderId, 'atlas'));
        ($this->handler)(new AcknowledgeOrder($this->orderId, 'atlas'));

        self::assertSame([['channel' => 'atlas', 'external_id' => 'ATLS-000001', 'reference' => $this->orderId]], $this->marketplace()->ackCalls);
        self::assertNotNull(($this->storedOrder('atlas', 'ATLS-000001') ?: [])['acknowledged_at'] ?? null);
        self::assertContains('ack.sent', $this->journalTypes('atlas'));
    }

    public function testAnAckThatHadInFactSucceededCountsAsSuccess(): void
    {
        $this->marketplace()->queueAck(AcknowledgementResult::AlreadyAcknowledged);
        ($this->handler)(new AcknowledgeOrder($this->orderId, 'atlas'));

        self::assertNotNull(($this->storedOrder('atlas', 'ATLS-000001') ?: [])['acknowledged_at'] ?? null);
    }

    public function testAConflictGoesStraightToTheFailureQueue(): void
    {
        $this->marketplace()->queueAck(AcknowledgementResult::Conflict);

        try {
            ($this->handler)(new AcknowledgeOrder($this->orderId, 'atlas'));
            self::fail('Expected an unrecoverable failure.');
        } catch (UnrecoverableMessageHandlingException) {
            self::assertContains('ack.conflict', $this->journalTypes('atlas'));
        }
    }

    public function testAThrottleWaitsForTheRetryAfterWithoutSpendingARetry(): void
    {
        $this->marketplace()->queueAck(FakeMarketplace::throttled(9));

        try {
            ($this->handler)(new AcknowledgeOrder($this->orderId, 'atlas'));
            self::fail('Expected a recoverable wait.');
        } catch (RecoverableMessageHandlingException $e) {
            self::assertSame(9000, $e->getRetryDelay());
        }
        self::assertEquals(new \DateTimeImmutable('2026-09-26T10:00:09Z'), self::service(ChannelStates::class)->get('atlas')->getThrottledUntil());
    }

    public function testAPausedChannelHoldsAcknowledgements(): void
    {
        $states = self::service(ChannelStates::class);
        $state = $states->get('atlas');
        $state->pause();
        $states->save($state);

        $this->expectException(RecoverableMessageHandlingException::class);
        try {
            ($this->handler)(new AcknowledgeOrder($this->orderId, 'atlas'));
        } finally {
            self::assertSame([], $this->marketplace()->ackCalls);
        }
    }

    public function testAnOutageIsARegularFailureForTheRetryStrategy(): void
    {
        $this->marketplace()->queueAck(FakeMarketplace::unavailable());

        $this->expectException(MarketplaceUnavailable::class);
        ($this->handler)(new AcknowledgeOrder($this->orderId, 'atlas'));
    }

    public function testAnUnknownOrderIsIgnored(): void
    {
        ($this->handler)(new AcknowledgeOrder('01890000-0000-7000-8000-000000000000', 'atlas'));

        self::assertSame([], $this->marketplace()->ackCalls);
    }
}
