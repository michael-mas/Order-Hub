<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

/**
 * Typed reads from a database row. A column that does not hold what the
 * schema promises is a bug to surface, not a value to coerce silently.
 */
final class Row
{
    /**
     * @param array<string, mixed> $row
     */
    public static function string(array $row, string $column): string
    {
        $value = $row[$column] ?? null;
        if (\is_string($value)) {
            return $value;
        }
        if (\is_int($value)) {
            return (string) $value;
        }

        throw new \UnexpectedValueException(\sprintf('Column "%s" is not a string.', $column));
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function nullableString(array $row, string $column): ?string
    {
        return null === ($row[$column] ?? null) ? null : self::string($row, $column);
    }

    /**
     * @param array<string, mixed> $row
     */
    public static function int(array $row, string $column): int
    {
        $value = $row[$column] ?? null;
        if (\is_int($value)) {
            return $value;
        }
        if (\is_string($value) && 1 === preg_match('/^-?\d+$/', $value)) {
            return (int) $value;
        }

        throw new \UnexpectedValueException(\sprintf('Column "%s" is not an integer.', $column));
    }

    public static function scalarToString(mixed $value): string
    {
        return \is_string($value) || \is_int($value) ? (string) $value : throw new \UnexpectedValueException('Expected a string or an integer.');
    }
}
