<?php

declare(strict_types=1);

namespace App\Domain\Order;

final class InvalidOrderPayload extends \DomainException
{
    public function __construct(public readonly string $field, string $reason)
    {
        parent::__construct(\sprintf('Invalid order payload: %s %s.', $field, $reason));
    }
}
