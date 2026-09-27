<?php

declare(strict_types=1);

namespace App\Application;

enum AcknowledgementResult: string
{
    case Acknowledged = 'acknowledged';
    /** Same reference already recorded: a retry that had in fact succeeded. */
    case AlreadyAcknowledged = 'already_acknowledged';
    /** Acknowledged with another reference: a human has to look. */
    case Conflict = 'conflict';
    case UnknownOrder = 'unknown_order';
}
