<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Application\ChannelRateLimiter;

final class FakeRateLimiter implements ChannelRateLimiter
{
    /** Calls allowed before the quota is spent; null means unlimited. */
    public ?int $remaining = null;
    public int $waitSeconds = 3;

    public function acquire(string $channel): int
    {
        if (null === $this->remaining) {
            return 0;
        }
        if ($this->remaining > 0) {
            --$this->remaining;

            return 0;
        }

        return $this->waitSeconds;
    }
}
