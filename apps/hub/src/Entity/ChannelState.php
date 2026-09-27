<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * What the hub remembers about each channel between two polls.
 */
#[ORM\Entity]
#[ORM\Table(name: 'channel_states')]
class ChannelState
{
    /**
     * Latest `updated_at` read by regular polls, in the marketplace's own
     * clock: the next poll starts there, minus the overlap.
     */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $cursor = null;

    /**
     * Where an unfinished reconciliation sweep resumes. Null when no sweep is
     * in progress: the next one starts from the full reconciliation window.
     */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $reconcileFrom = null;

    /** Set from the marketplace's Retry-After: no call before this instant. */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $throttledUntil = null;

    /** Set by an operator: no poll and no acknowledgement until resumed. */
    #[ORM\Column]
    private bool $paused = false;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $lastPollAt = null;

    #[ORM\Column(length: 16, nullable: true)]
    private ?string $lastPollOutcome = null;

    public function __construct(
        #[ORM\Id]
        #[ORM\Column(length: 32)]
        private string $code,
    ) {
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function getCursor(): ?\DateTimeImmutable
    {
        return $this->cursor;
    }

    public function advanceCursor(\DateTimeImmutable $to): void
    {
        // Never backwards: a slow poll finishing late must not rewind the cursor.
        if (null === $this->cursor || $to > $this->cursor) {
            $this->cursor = $to;
        }
    }

    public function getReconcileFrom(): ?\DateTimeImmutable
    {
        return $this->reconcileFrom;
    }

    public function continueReconciliationFrom(?\DateTimeImmutable $from): void
    {
        $this->reconcileFrom = $from;
    }

    public function getThrottledUntil(): ?\DateTimeImmutable
    {
        return $this->throttledUntil;
    }

    public function throttleUntil(\DateTimeImmutable $until): void
    {
        $this->throttledUntil = $until;
    }

    public function isThrottled(\DateTimeImmutable $now): bool
    {
        return null !== $this->throttledUntil && $this->throttledUntil > $now;
    }

    public function isPaused(): bool
    {
        return $this->paused;
    }

    public function pause(): void
    {
        $this->paused = true;
    }

    public function resume(): void
    {
        $this->paused = false;
        $this->throttledUntil = null;
    }

    public function getLastPollAt(): ?\DateTimeImmutable
    {
        return $this->lastPollAt;
    }

    public function getLastPollOutcome(): ?string
    {
        return $this->lastPollOutcome;
    }

    public function recordPoll(\DateTimeImmutable $at, string $outcome): void
    {
        $this->lastPollAt = $at;
        $this->lastPollOutcome = $outcome;
    }
}
