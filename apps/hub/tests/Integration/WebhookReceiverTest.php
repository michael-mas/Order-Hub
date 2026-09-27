<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Application\Message\IngestOrder;
use App\Application\WebhookReceiver;
use App\Application\WebhookResult;
use App\Domain\Webhook\WebhookSignature;
use App\Tests\Support\Orders;

final class WebhookReceiverTest extends DatabaseTestCase
{
    private const string SECRET = 'nova-demo-webhook-secret';

    private WebhookReceiver $receiver;

    protected function setUp(): void
    {
        parent::setUp();
        $this->receiver = self::service(WebhookReceiver::class);
    }

    public function testQueuesAVerifiedEventForIngestion(): void
    {
        [$body, $signature] = $this->event('evt_nova_00000001');

        self::assertSame(WebhookResult::Accepted, $this->receiver->receive('nova', $body, $signature, 'evt_nova_00000001'));
        $queued = $this->queued();
        self::assertCount(1, $queued);
        self::assertInstanceOf(IngestOrder::class, $queued[0]);
        self::assertSame('evt_nova_00000001', $queued[0]->eventId);
        self::assertSame('NOVA-000001', $queued[0]->payload['id']);
    }

    public function testAnswersADuplicateWithoutQueueingIt(): void
    {
        [$body, $signature] = $this->event('evt_nova_00000001');
        $this->receiver->receive('nova', $body, $signature, 'evt_nova_00000001');

        self::assertSame(WebhookResult::Duplicate, $this->receiver->receive('nova', $body, $signature, 'evt_nova_00000001'));
        self::assertCount(1, $this->queued());
        self::assertSame(['webhook.duplicate'], $this->journalTypes('nova'));
    }

    public function testRefusesABadSignatureBeforeReadingTheBody(): void
    {
        [$body] = $this->event('evt_nova_00000001');
        $forged = WebhookSignature::sign('not-the-secret', $this->clock()->now()->getTimestamp(), $body);

        self::assertSame(WebhookResult::Unauthorized, $this->receiver->receive('nova', $body, $forged, 'evt_nova_00000001'));
        self::assertSame([], $this->queued());
        self::assertSame(['webhook.rejected'], $this->journalTypes('nova'));
    }

    public function testRefusesAnOldSignature(): void
    {
        [$body, $signature] = $this->event('evt_nova_00000001');
        $this->clock()->sleep(301);

        self::assertSame(WebhookResult::Unauthorized, $this->receiver->receive('nova', $body, $signature, 'evt_nova_00000001'));
    }

    public function testRefusesAnEventIdThatDoesNotMatchItsHeader(): void
    {
        [$body, $signature] = $this->event('evt_nova_00000001');

        self::assertSame(WebhookResult::Invalid, $this->receiver->receive('nova', $body, $signature, 'evt_nova_99999999'));
    }

    public function testRefusesAnInvalidOrderUpFront(): void
    {
        [$body, $signature] = $this->event('evt_nova_00000002', Orders::payload(overrides: ['status' => 'lost']));

        self::assertSame(WebhookResult::Invalid, $this->receiver->receive('nova', $body, $signature, 'evt_nova_00000002'));
        self::assertSame(['order.invalid_payload'], $this->journalTypes('nova'));
    }

    public function testIgnoresChannelsWithoutWebhooks(): void
    {
        [$body, $signature] = $this->event('evt_1');

        self::assertSame(WebhookResult::UnknownChannel, $this->receiver->receive('atlas', $body, $signature, 'evt_1'));
        self::assertSame(WebhookResult::UnknownChannel, $this->receiver->receive('nope', $body, $signature, 'evt_1'));
    }

    /**
     * @param array<string, mixed>|null $order
     *
     * @return array{string, string}
     */
    private function event(string $eventId, ?array $order = null): array
    {
        $body = json_encode([
            'event_id' => $eventId,
            'type' => 'order.created',
            'occurred_at' => '2026-09-26T09:59:59.000Z',
            'marketplace' => 'nova',
            'order' => $order ?? Orders::payload('NOVA-000001'),
        ], \JSON_THROW_ON_ERROR);

        return [$body, WebhookSignature::sign(self::SECRET, $this->clock()->now()->getTimestamp(), $body)];
    }
}
