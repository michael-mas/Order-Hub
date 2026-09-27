<?php

declare(strict_types=1);

namespace App\Domain\Order;

/**
 * What happened to an incoming order version. Decided by the database in one
 * atomic statement, never by comparing arrival times.
 */
enum IngestionOutcome: string
{
    /** First time the hub sees this order. */
    case Created = 'created';
    /** A newer version replaced the stored one. */
    case Updated = 'updated';
    /** Same version as stored: a duplicate delivery or an overlapping poll. */
    case Unchanged = 'unchanged';
    /** Older than stored: arrived out of order, ignored. */
    case Stale = 'stale';
}
