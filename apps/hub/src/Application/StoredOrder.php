<?php

declare(strict_types=1);

namespace App\Application;

final readonly class StoredOrder
{
    public function __construct(
        public string $id,
        public string $channel,
        public string $externalId,
        public bool $acknowledged,
    ) {
    }
}
