<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Domain\Webhook\WebhookSignature;
use App\Tests\Support\Orders;

final class WebhookEndpointTest extends ApiTestCase
{
    public function testAnswersEachOutcomeWithItsStatus(): void
    {
        $body = json_encode(['event_id' => 'evt_nova_1', 'type' => 'order.created', 'order' => Orders::payload()], \JSON_THROW_ON_ERROR);
        $headers = [
            'x-marketplace-event-id' => 'evt_nova_1',
            'x-marketplace-signature' => WebhookSignature::sign('nova-demo-webhook-secret', $this->clock()->now()->getTimestamp(), $body),
        ];

        self::assertSame(202, $this->request('POST', '/webhooks/nova', $body, $headers)->getStatusCode());
        self::assertSame(200, $this->request('POST', '/webhooks/nova', $body, $headers)->getStatusCode());
        self::assertSame(401, $this->request('POST', '/webhooks/nova', $body.' ', $headers)->getStatusCode());
        self::assertSame(404, $this->request('POST', '/webhooks/atlas', $body, $headers)->getStatusCode());
        self::assertSame(405, $this->request('GET', '/webhooks/nova')->getStatusCode());
    }
}
