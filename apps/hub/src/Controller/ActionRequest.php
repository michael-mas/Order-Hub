<?php

declare(strict_types=1);

namespace App\Controller;

use App\Domain\Incident\RecommendedAction;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class ActionRequest
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Choice(callback: [self::class, 'actions'])]
        public string $action,
        #[Assert\Regex('/^[a-z][a-z0-9-]{1,31}$/')]
        public ?string $channel = null,
    ) {
    }

    /**
     * @return list<string>
     */
    public static function actions(): array
    {
        return array_column(RecommendedAction::cases(), 'value');
    }
}
