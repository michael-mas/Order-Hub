<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class JournalQuery
{
    public function __construct(
        #[Assert\Regex('/^\d{1,18}$/')]
        public ?string $after = null,
        #[Assert\Range(min: 1, max: 500)]
        public int $limit = 100,
        #[Assert\Choice(choices: ['info', 'warning', 'error'])]
        public string $min_severity = 'info',
        #[Assert\Regex('/^[a-z][a-z0-9-]{1,31}$/')]
        public ?string $channel = null,
    ) {
    }
}
