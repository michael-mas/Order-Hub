<?php

declare(strict_types=1);

namespace App\Domain\Incident;

enum IncidentLevel: string
{
    case Ok = 'ok';
    case Degraded = 'degraded';
    case Incident = 'incident';
}
