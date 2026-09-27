<?php

declare(strict_types=1);

namespace App\Domain\Incident;

interface Analyst
{
    /**
     * @throws AnalystUnavailable when this analyst cannot answer now
     */
    public function analyze(IncidentContext $context): Analysis;
}
