<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Infrastructure\Persistence\SqliteWriteTransactions;
use Doctrine\DBAL\Configuration;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Exception\LockWaitTimeoutException;
use PHPUnit\Framework\TestCase;

/**
 * The contention the demo meets under a storm: a web request reads then
 * writes while the worker writes. Deferred transactions fail it at once;
 * immediate ones make the second writer wait its turn.
 */
final class SqliteWriteTransactionsTest extends TestCase
{
    private string $path;

    protected function setUp(): void
    {
        $this->path = sys_get_temp_dir().'/order-hub-lock-'.bin2hex(random_bytes(4)).'.db';
        $setup = $this->connect(false);
        $setup->executeStatement('PRAGMA journal_mode = WAL');
        $setup->executeStatement('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
        $setup->close();
    }

    protected function tearDown(): void
    {
        foreach (glob($this->path.'*') ?: [] as $file) {
            unlink($file);
        }
    }

    public function testADeferredTransactionFailsWhenAnotherProcessWroteSinceItsRead(): void
    {
        $web = $this->connect(false);
        $worker = $this->connect(false);

        $web->beginTransaction();
        $web->fetchOne('SELECT COUNT(*) FROM t');
        $worker->insert('t', ['v' => 'worker']);

        $this->expectExceptionMessageMatches('/database is locked/');
        $web->insert('t', ['v' => 'web']);
    }

    public function testImmediateTransactionsQueueWritersInstead(): void
    {
        $web = $this->connect(true);
        $worker = $this->connect(true);
        $worker->executeStatement('PRAGMA busy_timeout = 50');

        $web->beginTransaction();
        $web->fetchOne('SELECT COUNT(*) FROM t');
        try {
            $worker->insert('t', ['v' => 'worker']);
            self::fail('The second writer must wait for the first.');
        } catch (LockWaitTimeoutException) {
        }
        $web->insert('t', ['v' => 'web']);
        $web->commit();

        $worker->insert('t', ['v' => 'worker']);
        self::assertSame(['web', 'worker'], $worker->fetchFirstColumn('SELECT v FROM t ORDER BY id'));
        // Readers are never blocked, even during a write transaction.
        $web->beginTransaction();
        $web->insert('t', ['v' => 'pending']);
        self::assertCount(2, $worker->fetchFirstColumn('SELECT id FROM t'));
        $web->rollBack();
    }

    private function connect(bool $immediate): Connection
    {
        $configuration = new Configuration();
        if ($immediate) {
            $configuration->setMiddlewares([new SqliteWriteTransactions()]);
        }

        return DriverManager::getConnection(['driver' => 'pdo_sqlite', 'path' => $this->path], $configuration);
    }
}
