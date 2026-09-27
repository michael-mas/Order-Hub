<?php

declare(strict_types=1);

namespace App\Application;

final readonly class OrdersPage
{
    /**
     * @param list<array<mixed>> $orders raw payloads, validated by the ingestor
     */
    public function __construct(
        public array $orders,
        public ?string $nextPageToken,
    ) {
    }
}
