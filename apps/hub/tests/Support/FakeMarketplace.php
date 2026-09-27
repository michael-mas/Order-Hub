<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Application\AcknowledgementResult;
use App\Application\MarketplaceClient;
use App\Application\MarketplaceThrottled;
use App\Application\MarketplaceUnavailable;
use App\Application\OrdersPage;
use App\Domain\Channel\Channel;

/**
 * A scriptable marketplace: queue answers, then inspect the calls received.
 */
final class FakeMarketplace implements MarketplaceClient
{
    /** @var list<OrdersPage|\Throwable> */
    private array $pages = [];
    /** @var list<AcknowledgementResult|\Throwable> */
    private array $acks = [];
    /** @var list<array{channel: string, since: \DateTimeImmutable, page_token: ?string}> */
    public array $listCalls = [];
    /** @var list<array{channel: string, external_id: string, reference: string}> */
    public array $ackCalls = [];

    public function queuePage(OrdersPage|\Throwable ...$pages): void
    {
        array_push($this->pages, ...$pages);
    }

    public function queueAck(AcknowledgementResult|\Throwable ...$results): void
    {
        array_push($this->acks, ...$results);
    }

    public function listOrders(Channel $channel, \DateTimeImmutable $updatedSince, ?string $pageToken, int $limit): OrdersPage
    {
        $this->listCalls[] = ['channel' => $channel->code, 'since' => $updatedSince, 'page_token' => $pageToken];
        $next = array_shift($this->pages) ?? new OrdersPage([], null);
        if ($next instanceof \Throwable) {
            throw $next;
        }

        return $next;
    }

    public function acknowledge(Channel $channel, string $externalId, string $merchantReference): AcknowledgementResult
    {
        $this->ackCalls[] = ['channel' => $channel->code, 'external_id' => $externalId, 'reference' => $merchantReference];
        $next = array_shift($this->acks) ?? AcknowledgementResult::Acknowledged;
        if ($next instanceof \Throwable) {
            throw $next;
        }

        return $next;
    }

    public static function throttled(int $seconds): MarketplaceThrottled
    {
        return new MarketplaceThrottled($seconds);
    }

    public static function unavailable(): MarketplaceUnavailable
    {
        return new MarketplaceUnavailable('Marketplace answered 503.');
    }
}
