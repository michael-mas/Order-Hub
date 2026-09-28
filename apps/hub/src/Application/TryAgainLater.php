<?php

declare(strict_types=1);

namespace App\Application;

/**
 * Not a failure: the work cannot happen now (channel paused, quota spent)
 * and should be retried after the delay, without counting as an attempt.
 */
final class TryAgainLater extends \RuntimeException
{
    public function __construct(string $message, public readonly int $delayMs, ?\Throwable $previous = null)
    {
        parent::__construct($message, 0, $previous);
    }
}
