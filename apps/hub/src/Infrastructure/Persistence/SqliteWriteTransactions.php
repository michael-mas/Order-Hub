<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use Doctrine\Bundle\DoctrineBundle\Attribute\AsMiddleware;
use Doctrine\DBAL\Driver;
use Doctrine\DBAL\Driver\Connection;
use Doctrine\DBAL\Driver\Middleware;
use Doctrine\DBAL\Driver\Middleware\AbstractConnectionMiddleware;
use Doctrine\DBAL\Driver\Middleware\AbstractDriverMiddleware;

/**
 * SQLite only (the public demo). A default, deferred transaction takes the
 * write lock at its first write; if another process wrote since its first
 * read, SQLite fails it at once ("database is locked") instead of waiting.
 * Under a storm, the web server and the worker hit that constantly.
 * `BEGIN IMMEDIATE` takes the write lock up front, so writers queue behind
 * each other for up to BUSY_TIMEOUT_MS; readers are never blocked (WAL).
 */
#[AsMiddleware]
final class SqliteWriteTransactions implements Middleware
{
    public const int BUSY_TIMEOUT_MS = 5000;

    public function wrap(Driver $driver): Driver
    {
        return new class($driver) extends AbstractDriverMiddleware {
            public function connect(#[\SensitiveParameter] array $params): Connection
            {
                $connection = parent::connect($params);
                if (!\in_array($params['driver'] ?? null, ['pdo_sqlite', 'sqlite3'], true)) {
                    return $connection;
                }
                $connection->exec('PRAGMA busy_timeout = '.SqliteWriteTransactions::BUSY_TIMEOUT_MS);

                return new class($connection) extends AbstractConnectionMiddleware {
                    public function beginTransaction(): void
                    {
                        $this->exec('BEGIN IMMEDIATE');
                    }

                    public function commit(): void
                    {
                        $this->exec('COMMIT');
                    }

                    public function rollBack(): void
                    {
                        $this->exec('ROLLBACK');
                    }
                };
            }
        };
    }
}
