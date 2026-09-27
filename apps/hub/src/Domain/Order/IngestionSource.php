<?php

declare(strict_types=1);

namespace App\Domain\Order;

enum IngestionSource: string
{
    case Webhook = 'webhook';
    case Poll = 'poll';
    case Reconcile = 'reconcile';
}
