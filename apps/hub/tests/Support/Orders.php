<?php

declare(strict_types=1);

namespace App\Tests\Support;

/**
 * Order payloads in the simulator's exact wire format.
 */
final class Orders
{
    /**
     * @param array<string, mixed> $overrides
     *
     * @return array<string, mixed>
     */
    public static function payload(string $id = 'NOVA-000001', int $version = 1, string $status = 'new', array $overrides = []): array
    {
        return array_replace([
            'id' => $id,
            'status' => $status,
            'currency' => 'EUR',
            'total_minor' => 4470,
            'lines' => [
                ['sku' => 'MUG-CER-350', 'title' => 'Ceramic mug 350 ml', 'quantity' => 3, 'unit_price_minor' => 1490],
            ],
            'buyer' => ['display_name' => 'Buyer 0412'],
            'created_at' => '2026-09-26T09:00:00.000Z',
            'updated_at' => \sprintf('2026-09-26T09:%02d:00.000Z', min(59, $version)),
            'version' => $version,
        ], $overrides);
    }
}
