<?php

declare(strict_types=1);

namespace App\Application;

/** Mutual exclusion across every hub process. */
interface Locks
{
    /** The lock, or null when another process holds it; expires after $ttlSeconds anyway. */
    public function tryAcquire(string $name, int $ttlSeconds): ?Lock;
}
