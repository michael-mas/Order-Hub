<?php

declare(strict_types=1);

namespace App\Domain\Incident;

final readonly class Recommendation
{
    public function __construct(
        public RecommendedAction $action,
        public ?string $channel,
        public string $rationale,
    ) {
    }
}
