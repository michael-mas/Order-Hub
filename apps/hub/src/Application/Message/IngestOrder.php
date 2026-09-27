<?php

declare(strict_types=1);

namespace App\Application\Message;

/**
 * An order payload received from a webhook, to be ingested by a worker so the
 * webhook endpoint can answer within milliseconds.
 */
final readonly class IngestOrder
{
    /**
     * @param array<mixed> $payload
     */
    public function __construct(
        public string $channel,
        public array $payload,
        public string $eventId,
    ) {
    }
}
