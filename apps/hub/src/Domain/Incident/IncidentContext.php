<?php

declare(strict_types=1);

namespace App\Domain\Incident;

/**
 * Everything the analyst is allowed to know. Its evidence ids are the only
 * ones a finding may cite.
 */
final readonly class IncidentContext
{
    /**
     * @param list<array{id: string, occurred_at: string, channel: ?string, type: string, severity: string, message: string, context: array<string, mixed>}> $events
     * @param list<array{code: string, paused: bool, throttled: bool, orders: int, acknowledged: int}>                                                       $channels
     */
    public function __construct(
        public \DateTimeImmutable $generatedAt,
        public int $windowMinutes,
        public array $events,
        public array $channels,
        public int $failedMessages,
        /** @var array<string, int> journal entries per type over the window, evidence or not */
        public array $eventCounts = [],
    ) {
    }

    /**
     * @return array<string, true>
     */
    public function evidenceIds(): array
    {
        return array_fill_keys(array_column($this->events, 'id'), true);
    }

    /**
     * @return list<string>
     */
    public function channelCodes(): array
    {
        return array_column($this->channels, 'code');
    }

    /**
     * @return list<array{id: string, occurred_at: string, channel: ?string, type: string, severity: string, message: string, context: array<string, mixed>}>
     */
    public function eventsOfType(string $type, ?string $channel = null): array
    {
        return array_values(array_filter(
            $this->events,
            static fn (array $e): bool => $e['type'] === $type && (null === $channel || $e['channel'] === $channel),
        ));
    }
}
