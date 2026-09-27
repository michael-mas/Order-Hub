<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Infrastructure\Persistence\Row;
use App\Tests\Support\FakeCompletion;
use App\Tests\Support\FakeMarketplace;
use App\Tests\Support\FakeRateLimiter;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\Messenger\Envelope;
use Symfony\Component\Messenger\Transport\InMemory\InMemoryTransport;

/**
 * Runs each test in a transaction rolled back afterwards, on the real
 * PostgreSQL schema: the upserts and constraints under test are PostgreSQL's.
 */
abstract class DatabaseTestCase extends KernelTestCase
{
    protected Connection $connection;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->connection = self::service(Connection::class);
        $this->connection->beginTransaction();
    }

    protected function tearDown(): void
    {
        if ($this->connection->isTransactionActive()) {
            $this->connection->rollBack();
        }
        parent::tearDown();
    }

    /**
     * @template T of object
     *
     * @param class-string<T> $id
     *
     * @return T
     */
    protected static function service(string $id): object
    {
        $service = static::getContainer()->get($id);
        \assert($service instanceof $id);

        return $service;
    }

    protected function marketplace(): FakeMarketplace
    {
        return self::service(FakeMarketplace::class);
    }

    protected function limiter(): FakeRateLimiter
    {
        return self::service(FakeRateLimiter::class);
    }

    protected function completion(): FakeCompletion
    {
        return self::service(FakeCompletion::class);
    }

    protected function clock(): MockClock
    {
        return self::service(MockClock::class);
    }

    protected function entityManager(): EntityManagerInterface
    {
        return self::service(EntityManagerInterface::class);
    }

    /**
     * @return list<object> messages sent to the async queue
     */
    protected function queued(): array
    {
        $transport = static::getContainer()->get('messenger.transport.async');
        \assert($transport instanceof InMemoryTransport);

        return array_map(static fn (Envelope $e): object => $e->getMessage(), array_values([...$transport->getSent()]));
    }

    /**
     * @return list<string> journal entry types, oldest first
     */
    protected function journalTypes(?string $channel = null): array
    {
        $sql = 'SELECT type FROM journal'.(null === $channel ? '' : ' WHERE channel = :channel').' ORDER BY id';

        return array_map(Row::scalarToString(...), $this->connection->fetchFirstColumn($sql, null === $channel ? [] : ['channel' => $channel]));
    }

    /**
     * @return array<string, mixed>|false
     */
    protected function storedOrder(string $channel, string $externalId): array|false
    {
        return $this->connection->fetchAssociative(
            'SELECT * FROM orders WHERE channel = :channel AND external_id = :id',
            ['channel' => $channel, 'id' => $externalId],
        );
    }
}
