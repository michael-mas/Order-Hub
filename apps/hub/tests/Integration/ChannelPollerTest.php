<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Application\ChannelPoller;
use App\Application\ChannelStates;
use App\Application\OrdersPage;
use App\Domain\Channel\PollMode;
use App\Tests\Support\FakeMarketplace;
use App\Tests\Support\Orders;

final class ChannelPollerTest extends DatabaseTestCase
{
    private ChannelPoller $poller;

    protected function setUp(): void
    {
        parent::setUp();
        $this->poller = self::service(ChannelPoller::class);
    }

    public function testReadsEveryPageAndCheckpointsOnTheLatestUpdate(): void
    {
        $this->marketplace()->queuePage(
            new OrdersPage([Orders::payload('ATLS-000001', 1), Orders::payload('ATLS-000002', 2)], 'p2'),
            new OrdersPage([Orders::payload('ATLS-000003', 5)], null),
        );

        $report = $this->poller->poll('atlas', PollMode::Window);

        self::assertSame('completed', $report->outcome);
        self::assertSame(2, $report->pages);
        self::assertSame(3, $report->counts['created']);
        self::assertSame([null, 'p2'], array_column($this->marketplace()->listCalls, 'page_token'));
        $state = self::service(ChannelStates::class)->get('atlas');
        self::assertEquals(new \DateTimeImmutable('2026-09-26T09:05:00Z'), $state->getCursor());
        self::assertSame(['order.created', 'order.created', 'order.created', 'poll.completed'], $this->journalTypes('atlas'));
    }

    public function testStartsTheNextPollAnOverlapBehindTheCheckpoint(): void
    {
        $this->marketplace()->queuePage(new OrdersPage([Orders::payload('ATLS-000001', 5)], null));
        $this->poller->poll('atlas', PollMode::Window);
        $this->poller->poll('atlas', PollMode::Window);

        $since = $this->marketplace()->listCalls[1]['since'];
        self::assertEquals(new \DateTimeImmutable('2026-09-26T09:04:30Z'), $since);
    }

    /**
     * The livelock found under the "storm" preset: a backlog larger than one
     * quota burst must still drain, poll after poll.
     */
    public function testABacklogLargerThanTheQuotaDrainsAcrossPolls(): void
    {
        $this->limiter()->remaining = 1;
        $this->marketplace()->queuePage(
            new OrdersPage([Orders::payload('ATLS-000001', 10)], 'p2'),
            new OrdersPage([Orders::payload('ATLS-000002', 20)], null),
        );

        $first = $this->poller->poll('atlas', PollMode::Window);
        self::assertSame('partial', $first->outcome);
        $state = self::service(ChannelStates::class)->get('atlas');
        self::assertEquals(new \DateTimeImmutable('2026-09-26T09:10:00Z'), $state->getCursor(), 'Progress is kept.');

        $this->limiter()->remaining = null;
        $second = $this->poller->poll('atlas', PollMode::Window);
        self::assertSame('completed', $second->outcome);
        self::assertEquals(new \DateTimeImmutable('2026-09-26T09:09:30Z'), $this->marketplace()->listCalls[1]['since']);
        self::assertIsArray($this->storedOrder('atlas', 'ATLS-000002'));
        self::assertSame(1, \count(array_filter($this->journalTypes('atlas'), static fn (string $t): bool => 'channel.local_quota_reached' === $t)));
    }

    public function testAThrottleSuspendsTheChannelForTheRetryAfter(): void
    {
        $this->marketplace()->queuePage(FakeMarketplace::throttled(42));

        self::assertSame('throttled', $this->poller->poll('atlas', PollMode::Window)->outcome);
        $state = self::service(ChannelStates::class)->get('atlas');
        self::assertEquals(new \DateTimeImmutable('2026-09-26T10:00:42Z'), $state->getThrottledUntil());
        self::assertSame('skipped', $this->poller->poll('atlas', PollMode::Window)->outcome);
        self::assertCount(1, $this->marketplace()->listCalls, 'No call during the back-off.');

        $this->clock()->sleep(42);
        $this->poller->poll('atlas', PollMode::Window);
        self::assertCount(2, $this->marketplace()->listCalls);
    }

    public function testAnOutageKeepsTheCursorAndIsJournaled(): void
    {
        $this->marketplace()->queuePage(FakeMarketplace::unavailable());

        self::assertSame('failed', $this->poller->poll('atlas', PollMode::Window)->outcome);
        self::assertNull(self::service(ChannelStates::class)->get('atlas')->getCursor());
        self::assertSame(['poll.failed'], $this->journalTypes('atlas'));
    }

    public function testAPausedChannelIsNotPolled(): void
    {
        $states = self::service(ChannelStates::class);
        $state = $states->get('atlas');
        $state->pause();
        $states->save($state);

        self::assertSame('skipped', $this->poller->poll('atlas', PollMode::Window)->outcome);
        self::assertSame([], $this->marketplace()->listCalls);
    }

    public function testAReconciliationResumesWhereItStoppedThenStartsOver(): void
    {
        $this->limiter()->remaining = 1;
        $this->marketplace()->queuePage(new OrdersPage([Orders::payload('ATLS-000001', 50)], 'p2'));
        self::assertSame('partial', $this->poller->poll('atlas', PollMode::Reconcile)->outcome);
        self::assertEquals(new \DateTimeImmutable('2026-09-26T09:50:00Z'), self::service(ChannelStates::class)->get('atlas')->getReconcileFrom());

        $this->limiter()->remaining = null;
        $this->marketplace()->queuePage(new OrdersPage([], null));
        self::assertSame('completed', $this->poller->poll('atlas', PollMode::Reconcile)->outcome);
        self::assertEquals(new \DateTimeImmutable('2026-09-26T09:50:00Z'), $this->marketplace()->listCalls[1]['since']);
        self::assertNull(self::service(ChannelStates::class)->get('atlas')->getReconcileFrom());
        self::assertEquals(new \DateTimeImmutable('2026-09-26T09:45:00Z'), $this->marketplace()->listCalls[0]['since'], 'A sweep starts at the edge of its window.');
        self::assertNull(self::service(ChannelStates::class)->get('atlas')->getCursor(), 'A reconciliation never moves the regular cursor.');
    }
}
