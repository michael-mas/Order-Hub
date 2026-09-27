<?php

declare(strict_types=1);

namespace App\Domain\Channel;

final class UnknownChannel extends \DomainException
{
    public function __construct(public readonly string $channel)
    {
        parent::__construct(\sprintf('Unknown channel "%s".', $channel));
    }
}
