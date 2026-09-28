<?php

declare(strict_types=1);

namespace App\Infrastructure\Messenger\Handler;

use App\Application\DataRetention;
use App\Application\Message\ApplyRetention;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class ApplyRetentionHandler
{
    public function __construct(private DataRetention $retention)
    {
    }

    public function __invoke(ApplyRetention $message): void
    {
        $this->retention->apply();
    }
}
