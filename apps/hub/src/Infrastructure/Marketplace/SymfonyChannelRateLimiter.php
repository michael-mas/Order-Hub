<?php

declare(strict_types=1);

namespace App\Infrastructure\Marketplace;

use App\Application\ChannelRateLimiter;
use App\Domain\Channel\UnknownChannel;
use Psr\Clock\ClockInterface;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

/**
 * One token bucket per channel, configured in config/packages/order_hub.yaml.
 */
final readonly class SymfonyChannelRateLimiter implements ChannelRateLimiter
{
    /** @var array<string, RateLimiterFactoryInterface> */
    private array $factories;

    public function __construct(
        RateLimiterFactoryInterface $marketplaceNovaLimiter,
        RateLimiterFactoryInterface $marketplaceAtlasLimiter,
        private ClockInterface $clock,
    ) {
        $this->factories = ['nova' => $marketplaceNovaLimiter, 'atlas' => $marketplaceAtlasLimiter];
    }

    public function acquire(string $channel): int
    {
        $factory = $this->factories[$channel] ?? throw new UnknownChannel($channel);
        $limit = $factory->create($channel)->consume();
        if ($limit->isAccepted()) {
            return 0;
        }

        return max(1, $limit->getRetryAfter()->getTimestamp() - $this->clock->now()->getTimestamp());
    }
}
