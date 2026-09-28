<?php

declare(strict_types=1);

namespace App\Application;

/**
 * How many model analyses may still run today. Anyone can press "Analyse"
 * on the public demo: without a ceiling, that button is a bill.
 */
interface ModelBudget
{
    /** Spends one analysis; false once today's budget is gone. */
    public function spend(): bool;

    public function dailyLimit(): int;
}
