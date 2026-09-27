<?php

declare(strict_types=1);

namespace App\Domain\Channel;

enum PollMode: string
{
    /** Short, frequent window from the cursor, with overlap. */
    case Window = 'window';
    /** Wide periodic safety net. */
    case Reconcile = 'reconcile';
}
