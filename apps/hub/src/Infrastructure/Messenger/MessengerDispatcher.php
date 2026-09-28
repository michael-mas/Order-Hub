<?php

declare(strict_types=1);

namespace App\Infrastructure\Messenger;

use App\Application\MessageDispatcher;
use Symfony\Component\Messenger\MessageBusInterface;

final readonly class MessengerDispatcher implements MessageDispatcher
{
    public function __construct(private MessageBusInterface $bus)
    {
    }

    public function dispatch(object $message): void
    {
        $this->bus->dispatch($message);
    }
}
