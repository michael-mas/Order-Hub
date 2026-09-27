<?php

declare(strict_types=1);

namespace App\Tests\Unit\Domain;

use App\Domain\Channel\PollingWindow;
use App\Domain\Channel\PollMode;
use App\Entity\ChannelState;
use PHPUnit\Framework\TestCase;

final class PollingWindowTest extends TestCase
{
    private PollingWindow $window;
    private \DateTimeImmutable $now;

    protected function setUp(): void
    {
        $this->window = new PollingWindow(overlapSeconds: 30, initialLookbackSeconds: 900, reconciliationSeconds: 600);
        $this->now = new \DateTimeImmutable('2026-09-26T10:00:00Z');
    }

    public function testReReadsAnOverlapBehindTheCursor(): void
    {
        $since = $this->window->since(new \DateTimeImmutable('2026-09-26T09:59:00Z'), $this->now, PollMode::Window);

        self::assertEquals(new \DateTimeImmutable('2026-09-26T09:58:30Z'), $since);
    }

    public function testStartsFromTheLookbackOnTheFirstPoll(): void
    {
        self::assertEquals(new \DateTimeImmutable('2026-09-26T09:45:00Z'), $this->window->since(null, $this->now, PollMode::Window));
    }

    public function testNeverTrustsACursorFromTheFuture(): void
    {
        $since = $this->window->since(new \DateTimeImmutable('2026-09-26T11:00:00Z'), $this->now, PollMode::Window);

        self::assertEquals(new \DateTimeImmutable('2026-09-26T09:59:30Z'), $since);
    }

    public function testReconciliationSweepsTheWholeWindowOrResumes(): void
    {
        self::assertEquals(new \DateTimeImmutable('2026-09-26T09:50:00Z'), $this->window->since(null, $this->now, PollMode::Reconcile));
        self::assertEquals(
            new \DateTimeImmutable('2026-09-26T09:55:00Z'),
            $this->window->since(new \DateTimeImmutable('2026-09-26T09:55:00Z'), $this->now, PollMode::Reconcile),
        );
        // A checkpoint older than the window restarts the sweep.
        self::assertEquals(
            new \DateTimeImmutable('2026-09-26T09:50:00Z'),
            $this->window->since(new \DateTimeImmutable('2026-09-26T08:00:00Z'), $this->now, PollMode::Reconcile),
        );
    }

    public function testRejectsNegativeDurations(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        new PollingWindow(-1, 0, 1);
    }

    public function testTheCursorNeverMovesBackwards(): void
    {
        $state = new ChannelState('atlas');
        $state->advanceCursor(new \DateTimeImmutable('2026-09-26T10:00:00Z'));
        $state->advanceCursor(new \DateTimeImmutable('2026-09-26T09:00:00Z'));

        self::assertEquals(new \DateTimeImmutable('2026-09-26T10:00:00Z'), $state->getCursor());
    }

    public function testThrottlingExpires(): void
    {
        $state = new ChannelState('atlas');
        $state->throttleUntil(new \DateTimeImmutable('2026-09-26T10:00:10Z'));

        self::assertTrue($state->isThrottled($this->now));
        self::assertFalse($state->isThrottled($this->now->modify('+10 seconds')));
        $state->resume();
        self::assertNull($state->getThrottledUntil());
    }
}
