<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Journal\EventType;

/**
 * Records a decision. Called inside the transaction of that decision, so the
 * journal never tells a story the database does not.
 */
interface Journal
{
    /**
     * @param array<string, scalar|array<mixed>|null> $context
     *
     * @return string the entry id
     */
    public function record(EventType $type, string $message, ?string $channel = null, array $context = []): string;
}
