<?php

declare(strict_types=1);

namespace App\Tests\Unit\Domain;

use App\Domain\Order\ExternalOrder;
use App\Domain\Order\InvalidOrderPayload;
use App\Tests\Support\Orders;
use PHPUnit\Framework\TestCase;

final class ExternalOrderTest extends TestCase
{
    public function testParsesTheSimulatorWireFormat(): void
    {
        $order = ExternalOrder::fromPayload(Orders::payload('NOVA-000042', 2, 'accepted'));

        self::assertSame('NOVA-000042', $order->externalId);
        self::assertSame('accepted', $order->status);
        self::assertSame(4470, $order->totalMinor);
        self::assertSame(2, $order->version);
        self::assertSame('2026-09-26T09:02:00+00:00', $order->updatedAt->format(\DATE_ATOM));
        self::assertSame([['sku' => 'MUG-CER-350', 'title' => 'Ceramic mug 350 ml', 'quantity' => 3, 'unit_price_minor' => 1490]], $order->linesAsArray());
    }

    public function testNormalisesOffsetsToUtc(): void
    {
        $order = ExternalOrder::fromPayload(Orders::payload(overrides: ['updated_at' => '2026-09-26T11:30:00+02:00']));

        self::assertSame('2026-09-26T09:30:00+00:00', $order->updatedAt->format(\DATE_ATOM));
    }

    /**
     * @dataProvider invalidPayloads
     *
     * @param array<string, mixed> $overrides
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('invalidPayloads')]
    public function testRejectsInvalidPayloads(array $overrides, string $field): void
    {
        try {
            ExternalOrder::fromPayload(array_replace(Orders::payload(), $overrides));
            self::fail('The payload should have been rejected.');
        } catch (InvalidOrderPayload $e) {
            self::assertSame($field, $e->field);
        }
    }

    /**
     * @return iterable<string, array{array<string, mixed>, string}>
     */
    public static function invalidPayloads(): iterable
    {
        yield 'missing id' => [['id' => null], 'id'];
        yield 'injection in id' => [['id' => "NOVA-1'; DROP TABLE orders;--"], 'id'];
        yield 'unknown status' => [['status' => 'teleported'], 'status'];
        yield 'bad currency' => [['currency' => 'euro'], 'currency'];
        yield 'no lines' => [['lines' => []], 'lines'];
        yield 'negative price' => [['lines' => [['sku' => 'A', 'title' => 'A', 'quantity' => 1, 'unit_price_minor' => -1]]], 'lines[0].unit_price_minor'];
        yield 'zero quantity' => [['lines' => [['sku' => 'A', 'title' => 'A', 'quantity' => 0, 'unit_price_minor' => 1]]], 'lines[0].quantity'];
        yield 'total mismatch' => [['total_minor' => 1], 'total_minor'];
        yield 'float amount' => [['total_minor' => 44.7], 'total_minor'];
        yield 'no buyer' => [['buyer' => 'x'], 'buyer'];
        yield 'bad date' => [['updated_at' => 'yesterday'], 'updated_at'];
        yield 'updated before created' => [['updated_at' => '2026-09-25T00:00:00.000Z'], 'updated_at'];
        yield 'version zero' => [['version' => 0], 'version'];
        yield 'version as string' => [['version' => '2'], 'version'];
    }
}
