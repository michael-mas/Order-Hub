<?php

declare(strict_types=1);

namespace App\Application;

/**
 * One unit of work: everything the closure writes, messages included, is
 * committed together or not at all (ADR 0005).
 */
interface Transactions
{
    /**
     * @template T
     *
     * @param \Closure(): T $work
     *
     * @return T
     */
    public function run(\Closure $work): mixed;
}
