<?php

declare(strict_types=1);

namespace App\Application;

enum WebhookResult: string
{
    case Accepted = 'accepted';
    /** Already accepted once: answered with success so the sender stops. */
    case Duplicate = 'duplicate';
    case Unauthorized = 'unauthorized';
    case Invalid = 'invalid';
    case UnknownChannel = 'unknown_channel';
}
