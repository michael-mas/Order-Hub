<?php

declare(strict_types=1);

namespace App\Domain\Incident;

final readonly class Finding
{
    /**
     * @param list<string> $evidence journal entry ids
     */
    public function __construct(
        public string $title,
        public string $explanation,
        public array $evidence,
    ) {
    }
}
