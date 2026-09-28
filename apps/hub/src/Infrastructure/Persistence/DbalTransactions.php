<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Application\Transactions;
use Doctrine\DBAL\Connection;

/**
 * The application's single connection: the Doctrine Messenger transport
 * writes to the same one, which is what makes the queue an outbox.
 */
final readonly class DbalTransactions implements Transactions
{
    public function __construct(private Connection $connection)
    {
    }

    public function run(\Closure $work): mixed
    {
        return $this->connection->transactional($work);
    }
}
