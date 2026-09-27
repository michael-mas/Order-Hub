<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Journal\Severity;

interface JournalReader
{
    /**
     * @return list<array{id: string, occurred_at: string, channel: ?string, type: string, severity: string, message: string, context: array<string, mixed>}>
     */
    public function journalSince(\DateTimeImmutable $since, Severity $minSeverity, int $limit): array;

    /**
     * @return array<string, int>
     */
    public function eventCounts(\DateTimeImmutable $since): array;

    /**
     * @return array<string, array{orders: int, acknowledged: int, updated_last_5_min: int}>
     */
    public function orderStatsByChannel(\DateTimeImmutable $now): array;
}
