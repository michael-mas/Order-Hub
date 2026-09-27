<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Incident\Analyst;

/** An analyst backed by a language model, which may not be configured. */
interface ModelAnalyst extends Analyst
{
    public function isConfigured(): bool;
}
