<?php

declare(strict_types=1);

namespace App\Domain\Order;

final readonly class OrderLine
{
    public function __construct(
        public string $sku,
        public string $title,
        public int $quantity,
        public int $unitPriceMinor,
    ) {
    }

    /**
     * @return array{sku: string, title: string, quantity: int, unit_price_minor: int}
     */
    public function toArray(): array
    {
        return [
            'sku' => $this->sku,
            'title' => $this->title,
            'quantity' => $this->quantity,
            'unit_price_minor' => $this->unitPriceMinor,
        ];
    }
}
