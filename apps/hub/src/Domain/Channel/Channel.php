<?php

declare(strict_types=1);

namespace App\Domain\Channel;

/**
 * A sales channel the hub imports orders from. Webhook channels are still
 * polled, less often: a webhook can be lost (ADR 0003).
 */
final readonly class Channel
{
    public function __construct(
        public string $code,
        public string $name,
        public bool $supportsWebhooks,
        public string $apiKey,
        public string $webhookSecret,
        /** Seconds between two regular polls. */
        public int $pollIntervalSeconds,
    ) {
        if (1 !== preg_match('/^[a-z][a-z0-9-]{1,31}$/', $code)) {
            throw new \InvalidArgumentException(\sprintf('Invalid channel code "%s".', $code));
        }
        if ($supportsWebhooks && '' === $webhookSecret) {
            throw new \InvalidArgumentException(\sprintf('Channel "%s" needs a webhook secret.', $code));
        }
    }
}
