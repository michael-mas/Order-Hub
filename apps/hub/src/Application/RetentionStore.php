<?php

declare(strict_types=1);

namespace App\Application;

/** Deletes what the hub no longer needs, in bounded batches. */
interface RetentionStore
{
    /** @return int entries deleted */
    public function deleteJournalBefore(\DateTimeImmutable $cutoff): int;

    /** @return int remembered webhook events deleted */
    public function deleteWebhookEventsBefore(\DateTimeImmutable $cutoff): int;
}
