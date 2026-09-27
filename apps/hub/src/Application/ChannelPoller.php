<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Channel\ChannelRegistry;
use App\Domain\Channel\PollingWindow;
use App\Domain\Channel\PollMode;
use App\Domain\Journal\EventType;
use App\Domain\Order\IngestionOutcome;
use App\Domain\Order\IngestionSource;
use Psr\Clock\ClockInterface;
use Symfony\Component\Lock\LockFactory;

/**
 * Reads a channel's recent changes page by page and feeds them to the ingestor.
 * Progress is checkpointed after every page, in the marketplace's own clock,
 * so a poll cut short by the quota resumes instead of starting over: a backlog
 * larger than one quota burst still drains.
 */
class ChannelPoller
{
    public const int PAGE_SIZE = 50;
    /** A runaway pagination must not hold the lock forever. */
    public const int MAX_PAGES = 40;

    public function __construct(
        private readonly ChannelRegistry $channels,
        private readonly ChannelStates $states,
        private readonly MarketplaceClient $client,
        private readonly ChannelRateLimiter $limiter,
        private readonly OrderIngestor $ingestor,
        private readonly Journal $journal,
        private readonly PollingWindow $window,
        private readonly LockFactory $locks,
        private readonly ClockInterface $clock,
    ) {
    }

    public function poll(string $channelCode, PollMode $mode): PollReport
    {
        $channel = $this->channels->get($channelCode);
        $lock = $this->locks->createLock('poll-'.$channelCode, ttl: 120);
        if (!$lock->acquire()) {
            return PollReport::skipped('already_running');
        }

        try {
            $state = $this->states->get($channelCode);
            $startedAt = $this->clock->now();
            if ($state->isPaused()) {
                return PollReport::skipped('paused');
            }
            if ($state->isThrottled($startedAt)) {
                return PollReport::skipped('throttled');
            }

            $reconciling = PollMode::Reconcile === $mode;
            $since = $this->window->since($reconciling ? $state->getReconcileFrom() : $state->getCursor(), $startedAt, $mode);
            $source = PollMode::Reconcile === $mode ? IngestionSource::Reconcile : IngestionSource::Poll;
            $counts = array_fill_keys(array_map(static fn (IngestionOutcome $o): string => $o->value, IngestionOutcome::cases()), 0);
            $counts['invalid'] = 0;
            $pages = 0;
            $pageToken = null;
            $outcome = 'completed';

            do {
                $wait = $this->limiter->acquire($channelCode);
                if ($wait > 0) {
                    // Reported once per episode, not on every tick of a long catch-up.
                    if ('partial' !== $state->getLastPollOutcome()) {
                        $this->journal->record(EventType::LocalQuotaReached, \sprintf('Local quota spent after %d page(s): the poll resumes where it stopped.', $pages), $channelCode, [
                            'mode' => $mode->value,
                            'retry_in_seconds' => $wait,
                        ]);
                    }
                    $outcome = 'partial';
                    break;
                }

                try {
                    $page = $this->client->listOrders($channel, $since, $pageToken, self::PAGE_SIZE);
                } catch (MarketplaceThrottled $e) {
                    $state->throttleUntil($this->clock->now()->modify(\sprintf('+%d seconds', $e->retryAfterSeconds)));
                    $this->journal->record(EventType::RateLimited, \sprintf('Marketplace quota exceeded: channel paused for %d s.', $e->retryAfterSeconds), $channelCode, [
                        'mode' => $mode->value,
                        'retry_after_seconds' => $e->retryAfterSeconds,
                        'pages_read' => $pages,
                    ]);
                    $outcome = 'throttled';
                    break;
                } catch (MarketplaceUnavailable $e) {
                    $this->journal->record(EventType::PollFailed, 'Poll interrupted: '.$e->getMessage(), $channelCode, [
                        'mode' => $mode->value,
                        'pages_read' => $pages,
                    ]);
                    $outcome = 'failed';
                    break;
                }

                ++$pages;
                foreach ($page->orders as $payload) {
                    $result = $this->ingestor->ingest($channelCode, $payload, $source);
                    ++$counts[null === $result ? 'invalid' : $result->value];
                }
                // Pages come in (updated_at, id) order, so everything before the
                // last timestamp read is done: a checkpoint that survives an
                // interrupted poll. Orders sharing that timestamp are read again
                // next time, harmlessly.
                $checkpoint = self::latestUpdatedAt($page->orders);
                if (null !== $checkpoint) {
                    $reconciling ? $state->continueReconciliationFrom($checkpoint) : $state->advanceCursor($checkpoint);
                }
                $pageToken = $page->nextPageToken;
            } while (null !== $pageToken && $pages < self::MAX_PAGES);

            if ('completed' === $outcome && null !== $pageToken) {
                $outcome = 'partial';
            }
            if ('completed' === $outcome && $reconciling) {
                // Sweep finished: the next one starts over from the full window.
                $state->continueReconciliationFrom(null);
            }
            $state->recordPoll($startedAt, $outcome);
            $this->states->save($state);

            $changes = $counts[IngestionOutcome::Created->value] + $counts[IngestionOutcome::Updated->value];
            if ('completed' === $outcome && ($changes > 0 || $reconciling)) {
                $this->journal->record(
                    EventType::PollCompleted,
                    $reconciling
                        ? \sprintf('Reconciliation: %d new, %d updated, %d already known.', $counts['created'], $counts['updated'], $counts['unchanged'])
                        : \sprintf('Poll: %d new, %d updated.', $counts['created'], $counts['updated']),
                    $channelCode,
                    ['mode' => $mode->value, 'pages' => $pages, 'since' => $since->format(\DATE_ATOM)] + $counts,
                );
            }

            return new PollReport($outcome, $pages, $counts);
        } finally {
            $lock->release();
        }
    }

    /**
     * @param list<array<mixed>> $payloads
     */
    private static function latestUpdatedAt(array $payloads): ?\DateTimeImmutable
    {
        $latest = null;
        foreach ($payloads as $payload) {
            $value = $payload['updated_at'] ?? null;
            if (!\is_string($value)) {
                continue;
            }
            try {
                $date = new \DateTimeImmutable($value);
            } catch (\Exception) {
                continue;
            }
            $latest = null === $latest || $date > $latest ? $date : $latest;
        }

        return $latest;
    }
}
