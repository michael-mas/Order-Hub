<?php

declare(strict_types=1);

namespace App\Domain\Order;

/**
 * An order as a marketplace publishes it, validated. Built only through
 * {@see self::fromPayload()}: nothing unchecked reaches the database.
 */
final readonly class ExternalOrder
{
    private const array STATUSES = ['new', 'accepted', 'shipped', 'cancelled'];

    /**
     * @param list<OrderLine> $lines
     */
    private function __construct(
        public string $externalId,
        public string $status,
        public string $currency,
        public int $totalMinor,
        public array $lines,
        public string $buyerDisplayName,
        public \DateTimeImmutable $createdAt,
        public \DateTimeImmutable $updatedAt,
        public int $version,
    ) {
    }

    /**
     * @param array<mixed> $payload
     *
     * @throws InvalidOrderPayload
     */
    public static function fromPayload(array $payload): self
    {
        $id = self::string($payload, 'id', 64);
        if (1 !== preg_match('/^[A-Z0-9][A-Z0-9-]*$/', $id)) {
            throw new InvalidOrderPayload('id', 'unexpected characters');
        }
        $status = self::string($payload, 'status', 16);
        if (!\in_array($status, self::STATUSES, true)) {
            throw new InvalidOrderPayload('status', \sprintf('unknown status "%s"', $status));
        }
        $currency = self::string($payload, 'currency', 3);
        if (1 !== preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new InvalidOrderPayload('currency', 'expected an ISO 4217 code');
        }

        $rawLines = $payload['lines'] ?? null;
        if (!\is_array($rawLines) || [] === $rawLines || !array_is_list($rawLines)) {
            throw new InvalidOrderPayload('lines', 'expected a non-empty list');
        }
        $lines = [];
        foreach ($rawLines as $index => $line) {
            if (!\is_array($line)) {
                throw new InvalidOrderPayload("lines[$index]", 'expected an object');
            }
            $lines[] = new OrderLine(
                self::string($line, 'sku', 64, "lines[$index]."),
                self::string($line, 'title', 255, "lines[$index]."),
                self::positiveInt($line, 'quantity', "lines[$index]."),
                self::naturalInt($line, 'unit_price_minor', "lines[$index]."),
            );
        }

        $total = self::naturalInt($payload, 'total_minor');
        $computed = array_sum(array_map(static fn (OrderLine $l): int => $l->quantity * $l->unitPriceMinor, $lines));
        if ($computed !== $total) {
            throw new InvalidOrderPayload('total_minor', \sprintf('does not match the lines (%d)', $computed));
        }

        $buyer = $payload['buyer'] ?? null;
        if (!\is_array($buyer)) {
            throw new InvalidOrderPayload('buyer', 'expected an object');
        }

        $createdAt = self::date($payload, 'created_at');
        $updatedAt = self::date($payload, 'updated_at');
        if ($updatedAt < $createdAt) {
            throw new InvalidOrderPayload('updated_at', 'earlier than created_at');
        }

        return new self(
            $id,
            $status,
            $currency,
            $total,
            $lines,
            self::string($buyer, 'display_name', 128, 'buyer.'),
            $createdAt,
            $updatedAt,
            self::positiveInt($payload, 'version'),
        );
    }

    /**
     * @return list<array{sku: string, title: string, quantity: int, unit_price_minor: int}>
     */
    public function linesAsArray(): array
    {
        return array_map(static fn (OrderLine $l): array => $l->toArray(), $this->lines);
    }

    /**
     * @param array<mixed> $data
     */
    private static function string(array $data, string $key, int $maxLength, string $prefix = ''): string
    {
        $value = $data[$key] ?? null;
        if (!\is_string($value) || '' === trim($value)) {
            throw new InvalidOrderPayload($prefix.$key, 'expected a non-empty string');
        }
        if (mb_strlen($value) > $maxLength) {
            throw new InvalidOrderPayload($prefix.$key, \sprintf('longer than %d characters', $maxLength));
        }

        return $value;
    }

    /**
     * @param array<mixed> $data
     */
    private static function naturalInt(array $data, string $key, string $prefix = ''): int
    {
        $value = $data[$key] ?? null;
        if (!\is_int($value) || $value < 0) {
            throw new InvalidOrderPayload($prefix.$key, 'expected a non-negative integer');
        }

        return $value;
    }

    /**
     * @param array<mixed> $data
     */
    private static function positiveInt(array $data, string $key, string $prefix = ''): int
    {
        $value = self::naturalInt($data, $key, $prefix);
        if (0 === $value) {
            throw new InvalidOrderPayload($prefix.$key, 'expected a positive integer');
        }

        return $value;
    }

    /**
     * @param array<mixed> $data
     */
    private static function date(array $data, string $key): \DateTimeImmutable
    {
        $value = self::string($data, $key, 40);
        $date = \DateTimeImmutable::createFromFormat('Y-m-d\TH:i:s.vP', $value)
            ?: \DateTimeImmutable::createFromFormat(\DateTimeInterface::ATOM, $value);
        if (false === $date) {
            throw new InvalidOrderPayload($key, 'expected an ISO 8601 date-time');
        }

        return $date->setTimezone(new \DateTimeZone('UTC'));
    }
}
