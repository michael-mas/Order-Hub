<?php

declare(strict_types=1);

namespace App\Application;

final class MarketplaceThrottled extends \RuntimeException
{
    public function __construct(public readonly int $retryAfterSeconds)
    {
        parent::__construct(\sprintf('Marketplace quota exceeded, retry after %d s.', $retryAfterSeconds));
    }
}
