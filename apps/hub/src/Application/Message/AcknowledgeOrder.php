<?php

declare(strict_types=1);

namespace App\Application\Message;

/**
 * Tell the marketplace the order is safely stored. Dispatched in the same
 * transaction as the order itself (ADR 0005): both exist, or neither does.
 */
final readonly class AcknowledgeOrder
{
    public function __construct(
        public string $orderId,
        public string $channel,
    ) {
    }
}
