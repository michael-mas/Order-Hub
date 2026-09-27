<?php

declare(strict_types=1);

namespace App\Domain\Journal;

enum Severity: string
{
    case Info = 'info';
    case Warning = 'warning';
    case Error = 'error';

    public function rank(): int
    {
        return match ($this) {
            self::Info => 0,
            self::Warning => 1,
            self::Error => 2,
        };
    }
}
