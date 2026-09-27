<?php

declare(strict_types=1);

namespace App\Tests\Unit\Domain;

use App\Domain\Incident\IncidentContext;

final class IncidentFixtures
{
    /**
     * @param list<array{0: string, 1: ?string, 2?: string}> $events [type, channel, severity]
     * @param array<string, bool>                            $paused
     */
    public static function context(array $events = [], int $failed = 0, array $paused = []): IncidentContext
    {
        $entries = [];
        foreach ($events as $i => $event) {
            $entries[] = [
                'id' => (string) (100 + $i),
                'occurred_at' => '2026-09-26T09:50:00Z',
                'channel' => $event[1],
                'type' => $event[0],
                'severity' => $event[2] ?? 'warning',
                'message' => $event[0],
                'context' => [],
            ];
        }
        $channels = [];
        foreach (['nova', 'atlas'] as $code) {
            $channels[] = ['code' => $code, 'paused' => $paused[$code] ?? false, 'throttled' => false, 'orders' => 10, 'acknowledged' => 10];
        }

        return new IncidentContext(new \DateTimeImmutable('2026-09-26T10:00:00Z'), 30, $entries, $channels, $failed);
    }
}
