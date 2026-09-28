<?php

declare(strict_types=1);

namespace App\Infrastructure\Ai;

use App\Application\ModelBudget;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

/**
 * A fixed daily window shared by every hub process through the database.
 */
final readonly class RateLimiterModelBudget implements ModelBudget
{
    public function __construct(
        #[Target('model_analyses')]
        private RateLimiterFactoryInterface $limiter,
        #[Autowire('%env(int:MODEL_DAILY_ANALYSES)%')]
        private int $limit,
    ) {
    }

    public function spend(): bool
    {
        return $this->limiter->create('all')->consume()->isAccepted();
    }

    public function dailyLimit(): int
    {
        return $this->limit;
    }
}
