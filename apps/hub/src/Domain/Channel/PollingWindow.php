<?php

declare(strict_types=1);

namespace App\Domain\Channel;

/**
 * Where a poll starts reading. Marketplaces list a change under its real
 * `updated_at`, but only once it becomes visible, sometimes seconds later. A
 * window that starts exactly where the previous poll stopped misses those
 * changes for good; re-reading an overlap catches them, and deduplication
 * makes the re-read free of side effects.
 */
final readonly class PollingWindow
{
    public function __construct(
        /** Re-read this far behind the cursor on every regular poll. */
        public int $overlapSeconds,
        /** First poll of a channel: how far back to start. */
        public int $initialLookbackSeconds,
        /** Reconciliation: a wide safety net, swept in as many polls as the quota requires. */
        public int $reconciliationSeconds,
    ) {
        if ($overlapSeconds < 0 || $initialLookbackSeconds < 0 || $reconciliationSeconds <= 0) {
            throw new \InvalidArgumentException('Polling window durations must be positive.');
        }
    }

    /**
     * @param \DateTimeImmutable|null $cursor for a window poll, the latest `updated_at` read so far;
     *                                        for a reconciliation, where an unfinished sweep resumes
     */
    public function since(?\DateTimeImmutable $cursor, \DateTimeImmutable $now, PollMode $mode): \DateTimeImmutable
    {
        if (PollMode::Reconcile === $mode) {
            $start = $now->modify(\sprintf('-%d seconds', $this->reconciliationSeconds));

            // Resume an interrupted sweep, unless it is older than the window itself.
            return null !== $cursor && $cursor > $start ? min($cursor, $now) : $start;
        }
        if (null === $cursor) {
            return $now->modify(\sprintf('-%d seconds', $this->initialLookbackSeconds));
        }
        // A cursor from the future (clock skew) must not skip anything.
        $start = min($cursor, $now);

        return $start->modify(\sprintf('-%d seconds', $this->overlapSeconds));
    }
}
