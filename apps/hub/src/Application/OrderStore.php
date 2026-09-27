<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Order\ExternalOrder;
use App\Domain\Order\IngestionSource;

interface OrderStore
{
    public function upsert(string $channel, ExternalOrder $order, IngestionSource $source, \DateTimeImmutable $now): UpsertResult;

    public function find(string $orderId): ?StoredOrder;

    public function markAcknowledged(string $orderId, \DateTimeImmutable $at): void;
}
