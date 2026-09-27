<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\ChannelPoller;
use App\Application\Message\PollChannel;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class PollChannelHandler
{
    public function __construct(private ChannelPoller $poller)
    {
    }

    public function __invoke(PollChannel $message): void
    {
        $this->poller->poll($message->channel, $message->mode);
    }
}
