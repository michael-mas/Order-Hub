<?php

declare(strict_types=1);

namespace App\Application;

final readonly class FailedMessage
{
    public function __construct(
        public string $id,
        public string $type,
        public ?string $channel,
        public ?string $orderId,
        public string $error,
        public int $attempts,
        public ?\DateTimeImmutable $failedAt,
    ) {
    }
}
