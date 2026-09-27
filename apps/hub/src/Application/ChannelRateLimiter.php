<?php

declare(strict_types=1);

namespace App\Application;

/**
 * The hub's own spending of a channel's quota, checked before every call.
 */
interface ChannelRateLimiter
{
    /**
     * @return int 0 when a call may go now, otherwise the seconds to wait
     */
    public function acquire(string $channel): int;
}
