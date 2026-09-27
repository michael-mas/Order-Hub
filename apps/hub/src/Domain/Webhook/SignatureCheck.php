<?php

declare(strict_types=1);

namespace App\Domain\Webhook;

enum SignatureCheck: string
{
    case Valid = 'valid';
    case Malformed = 'malformed';
    case Expired = 'expired';
    case Mismatch = 'mismatch';
}
