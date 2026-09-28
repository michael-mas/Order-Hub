<?php

declare(strict_types=1);

namespace App\Application;

/**
 * Hands a message to the queue. Inside {@see Transactions::run()}, the
 * message is committed with the decision that produced it: the queue is the
 * outbox (ADR 0005).
 */
interface MessageDispatcher
{
    public function dispatch(object $message): void;
}
