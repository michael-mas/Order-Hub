<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Journal\EventType;
use Psr\Clock\ClockInterface;

/**
 * Keeps the two append-only tables bounded. Journal entries older than the
 * retention go; remembered webhook event ids go once no marketplace would
 * still redeliver them (their retries span minutes, the window days).
 * Orders are never purged: they are the business data.
 */
final readonly class DataRetention
{
    public function __construct(
        private RetentionStore $store,
        private Journal $journal,
        private ClockInterface $clock,
        private int $journalDays,
        private int $webhookEventDays,
    ) {
        if ($journalDays < 1 || $webhookEventDays < 1) {
            throw new \InvalidArgumentException('Retention periods are at least one day.');
        }
    }

    /**
     * @return array{journal: int, webhook_events: int}
     */
    public function apply(): array
    {
        $now = $this->clock->now();
        $deleted = [
            'journal' => $this->store->deleteJournalBefore($now->modify(\sprintf('-%d days', $this->journalDays))),
            'webhook_events' => $this->store->deleteWebhookEventsBefore($now->modify(\sprintf('-%d days', $this->webhookEventDays))),
        ];
        if ($deleted['journal'] + $deleted['webhook_events'] > 0) {
            $this->journal->record(EventType::RetentionApplied, \sprintf(
                'Retention: %d journal entries older than %d days and %d webhook event ids older than %d days deleted.',
                $deleted['journal'],
                $this->journalDays,
                $deleted['webhook_events'],
                $this->webhookEventDays,
            ), null, $deleted + ['journal_days' => $this->journalDays, 'webhook_event_days' => $this->webhookEventDays]);
        }

        return $deleted;
    }
}
