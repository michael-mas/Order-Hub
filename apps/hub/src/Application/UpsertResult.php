<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Order\IngestionOutcome;

final readonly class UpsertResult
{
    public function __construct(
        public IngestionOutcome $outcome,
        public string $orderId,
        /** The version stored once the statement has run. */
        public int $storedVersion,
    ) {
    }
}
