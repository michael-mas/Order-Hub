<?php

declare(strict_types=1);

namespace App\Application;

final readonly class PollReport
{
    /**
     * @param 'completed'|'partial'|'throttled'|'failed'|'skipped' $outcome
     * @param array<string, int>                                   $counts  per ingestion outcome, plus "invalid"
     */
    public function __construct(
        public string $outcome,
        public int $pages,
        public array $counts = [],
        public ?string $skipReason = null,
    ) {
    }

    public static function skipped(string $reason): self
    {
        return new self('skipped', 0, [], $reason);
    }
}
