<?php

declare(strict_types=1);

namespace App\Application;

interface WebhookEventStore
{
    /**
     * @return bool true the first time this event id is seen for the channel
     */
    public function remember(string $channel, string $eventId, \DateTimeImmutable $now): bool;
}
