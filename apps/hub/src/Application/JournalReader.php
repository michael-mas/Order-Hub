<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Journal\Severity;

/**
 * Read side of the journal and of order statistics, shaped for the console
 * and the incident analyst.
 */
interface JournalReader
{
    /**
     * Newest entries first when `$afterId` is null (initial load), otherwise
     * every entry after it in ascending order (live tail).
     *
     * @return list<array{id: string, occurred_at: string, channel: ?string, type: string, severity: string, message: string, context: array<string, mixed>}>
     */
    public function journal(?string $afterId, int $limit, Severity $minSeverity = Severity::Info, ?string $channel = null): array;

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
