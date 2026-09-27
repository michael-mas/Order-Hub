<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Application\Journal;
use App\Application\OrderIngestor;
use App\Domain\Journal\EventType;
use App\Domain\Order\IngestionSource;
use App\Tests\Support\Orders;

final class ApiTest extends ApiTestCase
{
    public function testHealth(): void
    {
        self::assertSame(['status' => 'ok'], $this->json($this->request('GET', '/health')));
    }

    public function testTailsTheJournal(): void
    {
        $journal = self::service(Journal::class);
        $first = $journal->record(EventType::OrderCreated, 'one', 'nova');
        $journal->record(EventType::RateLimited, 'two', 'atlas');
        $journal->record(EventType::PollFailed, 'three', 'atlas');

        $all = $this->request('GET', '/api/journal');
        self::assertSame(['one', 'two', 'three'], array_column($this->rows($all, 'entries'), 'message'));

        $tail = $this->request('GET', '/api/journal?after='.$first);
        self::assertSame(['two', 'three'], array_column($this->rows($tail, 'entries'), 'message'));
        self::assertSame($this->json($all)['last_id'], $this->json($tail)['last_id']);

        $errors = $this->request('GET', '/api/journal?min_severity=error');
        self::assertSame(['three'], array_column($this->rows($errors, 'entries'), 'message'));

        self::assertSame(422, $this->request('GET', '/api/journal?min_severity=panic')->getStatusCode());
        self::assertSame(422, $this->request('GET', '/api/journal?limit=100000')->getStatusCode());
    }

    public function testExposesOrdersThroughApiPlatform(): void
    {
        self::service(OrderIngestor::class)->ingest('nova', Orders::payload('NOVA-000007', 2, 'accepted'), IngestionSource::Poll);

        $orders = $this->rows($this->request('GET', '/api/orders?channel=nova'));
        self::assertSame('NOVA-000007', $orders[0]['externalId'] ?? null);
        self::assertSame(2, $orders[0]['version'] ?? null);
        self::assertSame([], $this->json($this->request('GET', '/api/orders?channel=atlas')));
    }

    public function testChannelsCanBePausedAndResumed(): void
    {
        self::assertSame(202, $this->request('POST', '/api/channels/atlas/pause')->getStatusCode());
        $paused = array_column($this->rows($this->request('GET', '/api/channels'), 'channels'), 'paused', 'code');
        self::assertSame(['nova' => false, 'atlas' => true], $paused);

        $this->request('POST', '/api/channels/atlas/resume');
        $paused = array_column($this->rows($this->request('GET', '/api/channels'), 'channels'), 'paused', 'code');
        self::assertSame(['nova' => false, 'atlas' => false], $paused);
        self::assertSame(['channel.paused', 'channel.resumed'], $this->journalTypes('atlas'));

        self::assertSame(404, $this->request('POST', '/api/channels/mars/pause')->getStatusCode());
        self::assertSame(404, $this->request('POST', '/api/channels/atlas/delete')->getStatusCode());
    }

    public function testProducesAnIncidentAnalysis(): void
    {
        $response = $this->request('POST', '/api/incident-analyses');

        self::assertSame(201, $response->getStatusCode());
        $analysis = $this->json($response);
        self::assertSame('rules', $analysis['engine']);
        self::assertSame('ok', $analysis['level']);
    }

    public function testRunsOnlyActionsFromTheClosedList(): void
    {
        $ok = $this->request('POST', '/api/incident-analyses/actions', json_encode(['action' => 'reconcile_channel', 'channel' => 'atlas'], \JSON_THROW_ON_ERROR));
        self::assertSame(202, $ok->getStatusCode());
        self::assertSame(['channel.reconcile_requested'], $this->journalTypes('atlas'));

        foreach ([
            ['action' => 'drop_database'],
            ['action' => 'pause_channel'],
            ['action' => 'pause_channel', 'channel' => 'mars'],
            ['action' => 'pause_channel', 'channel' => '../etc'],
        ] as $payload) {
            $response = $this->request('POST', '/api/incident-analyses/actions', json_encode($payload, \JSON_THROW_ON_ERROR));
            self::assertSame(422, $response->getStatusCode(), json_encode($payload, \JSON_THROW_ON_ERROR));
        }
    }

    public function testSummarisesRecentActivity(): void
    {
        self::service(OrderIngestor::class)->ingest('atlas', Orders::payload('ATLS-000001'), IngestionSource::Poll);

        $overview = $this->json($this->request('GET', '/api/overview'));
        self::assertSame(1, $overview['orders']);
        self::assertSame(0, $overview['acknowledged']);
        self::assertSame(0, $overview['failed_messages']);
        self::assertSame(['order.created' => 1], $overview['events_last_15_min']);
    }
}
