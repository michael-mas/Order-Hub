<?php

declare(strict_types=1);

namespace App\Application;

/** Retrying cannot change the outcome: the work goes to the failure queue, for a human. */
final class CannotSucceed extends \RuntimeException
{
}
