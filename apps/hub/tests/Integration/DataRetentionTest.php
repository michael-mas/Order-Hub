<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Application\DataRetention;
use App\Application\Journal;
use App\Application\RetentionStore;
use App\Application\WebhookEventStore;
use App\Domain\Journal\EventType;
use App\Infrastructure\Persistence\Row;

final class DataRetentionTest extends DatabaseTestCase
{
    public function testDeletesOnlyWhatIsPastItsRetention(): void
    {
        $journal = self::service(Journal::class);
        $events = self::service(WebhookEventStore::class);

        // 40 days ago: past both retentions (30 and 7 days by default).
        $this->clock()->modify('-40 days');
        $old = $journal->record(EventType::OrderCreated, 'old', 'nova');
        $events->remember('nova', 'evt-old', $this->clock()->now());
        // 10 days ago: past the webhook window only.
        $this->clock()->modify('+30 days');
        $recent = $journal->record(EventType::OrderCreated, 'recent', 'nova');
        $events->remember('nova', 'evt-10-days', $this->clock()->now());
        $this->clock()->modify('+10 days');
        $events->remember('nova', 'evt-today', $this->clock()->now());

        $deleted = self::service(DataRetention::class)->apply();

        self::assertSame(['journal' => 1, 'webhook_events' => 2], $deleted);
        $ids = array_map(Row::scalarToString(...), $this->connection->fetchFirstColumn('SELECT id FROM journal ORDER BY id'));
        self::assertNotContains($old, $ids);
        self::assertContains($recent, $ids);
        self::assertSame(['evt-today'], $this->connection->fetchFirstColumn('SELECT event_id FROM webhook_events'));
        self::assertSame(1, $this->entries('retention.applied'));
        // Deduplication still works for what is kept, and forgets what is not.
        self::assertFalse($events->remember('nova', 'evt-today', $this->clock()->now()));
        self::assertTrue($events->remember('nova', 'evt-old', $this->clock()->now()));
    }

    public function testStaysSilentWhenNothingIsDue(): void
    {
        self::service(Journal::class)->record(EventType::OrderCreated, 'fresh', 'nova');

        self::assertSame(['journal' => 0, 'webhook_events' => 0], self::service(DataRetention::class)->apply());
        self::assertSame(0, $this->entries('retention.applied'));
    }

    public function testRefusesAZeroDayRetention(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        new DataRetention(
            self::service(RetentionStore::class),
            self::service(Journal::class),
            $this->clock(),
            0,
            7,
        );
    }

    private function entries(string $type): int
    {
        $row = $this->connection->fetchAssociative('SELECT COUNT(*) AS n FROM journal WHERE type = ?', [$type]);
        self::assertIsArray($row);

        return Row::int($row, 'n');
    }
}
