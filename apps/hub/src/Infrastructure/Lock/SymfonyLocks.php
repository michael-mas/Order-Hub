<?php

declare(strict_types=1);

namespace App\Infrastructure\Lock;

use App\Application\Lock;
use App\Application\Locks;
use Symfony\Component\Lock\LockFactory;
use Symfony\Component\Lock\SharedLockInterface;

final readonly class SymfonyLocks implements Locks
{
    public function __construct(private LockFactory $factory)
    {
    }

    public function tryAcquire(string $name, int $ttlSeconds): ?Lock
    {
        $lock = $this->factory->createLock($name, ttl: $ttlSeconds);
        if (!$lock->acquire()) {
            return null;
        }

        return new readonly class($lock) implements Lock {
            public function __construct(private SharedLockInterface $lock)
            {
            }

            public function release(): void
            {
                $this->lock->release();
            }
        };
    }
}
