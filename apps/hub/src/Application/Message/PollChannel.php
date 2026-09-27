<?php

declare(strict_types=1);

namespace App\Application\Message;

use App\Domain\Channel\PollMode;

final readonly class PollChannel
{
    public function __construct(
        public string $channel,
        public PollMode $mode = PollMode::Window,
    ) {
    }
}
