<?php

declare(strict_types=1);

namespace App\Application;

/**
 * The dead-letter queue, as operators see it.
 */
interface FailedMessages
{
    public function count(): int;

    /**
     * @return list<FailedMessage>
     */
    public function list(int $limit = 50): array;

    /** Sends the message back to its queue with a fresh retry budget. */
    public function replay(string $id): bool;

    /** @return int how many messages were replayed */
    public function replayAll(): int;
}
