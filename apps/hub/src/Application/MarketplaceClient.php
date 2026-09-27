<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Channel\Channel;

/**
 * The hub's view of a marketplace API. Implementations translate transport
 * details into these outcomes and exceptions, nothing more.
 */
interface MarketplaceClient
{
    /**
     * @throws MarketplaceThrottled
     * @throws MarketplaceUnavailable
     */
    public function listOrders(Channel $channel, \DateTimeImmutable $updatedSince, ?string $pageToken, int $limit): OrdersPage;

    /**
     * @throws MarketplaceThrottled
     * @throws MarketplaceUnavailable
     */
    public function acknowledge(Channel $channel, string $externalId, string $merchantReference): AcknowledgementResult;
}
