<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Application\JournalReader;
use App\Domain\Journal\Severity;
use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Types\Types;

/**
 * Read side for the console: plain SQL shaped for the screens, no entities.
 */
final readonly class ReadModel implements JournalReader
{
    public function __construct(private Connection $connection)
    {
    }

    /**
     * Newest entries first when `$afterId` is null (initial load), otherwise
     * every entry after it in ascending order (live tail).
     *
     * @return list<array{id: string, occurred_at: string, channel: ?string, type: string, severity: string, message: string, context: array<string, mixed>}>
     */
    public function journal(?string $afterId, int $limit, Severity $minSeverity = Severity::Info, ?string $channel = null): array
    {
        $severities = array_values(array_map(
            static fn (Severity $s): string => $s->value,
            array_filter(Severity::cases(), static fn (Severity $s): bool => $s->rank() >= $minSeverity->rank()),
        ));
        $qb = $this->connection->createQueryBuilder()
            ->select('id', 'occurred_at', 'channel', 'type', 'severity', 'message', 'context')
            ->from('journal')
            ->where('severity IN (:severities)')
            ->setParameter('severities', $severities, ArrayParameterType::STRING)
            ->setMaxResults($limit);
        if (null !== $channel) {
            $qb->andWhere('channel = :channel')->setParameter('channel', $channel);
        }
        if (null !== $afterId) {
            $qb->andWhere('id > :after')->setParameter('after', $afterId)->orderBy('id', 'ASC');
        } else {
            $qb->orderBy('id', 'DESC');
        }

        $rows = $qb->executeQuery()->fetchAllAssociative();
        if (null === $afterId) {
            $rows = array_reverse($rows);
        }

        return array_map($this->entry(...), $rows);
    }

    /**
     * The most recent entries at or above a severity since an instant, oldest
     * first: the evidence handed to the incident analyst.
     *
     * @return list<array{id: string, occurred_at: string, channel: ?string, type: string, severity: string, message: string, context: array<string, mixed>}>
     */
    public function journalSince(\DateTimeImmutable $since, Severity $minSeverity, int $limit): array
    {
        $severities = array_values(array_map(
            static fn (Severity $s): string => $s->value,
            array_filter(Severity::cases(), static fn (Severity $s): bool => $s->rank() >= $minSeverity->rank()),
        ));
        $rows = $this->connection->createQueryBuilder()
            ->select('id', 'occurred_at', 'channel', 'type', 'severity', 'message', 'context')
            ->from('journal')
            ->where('severity IN (:severities)')
            ->andWhere('occurred_at >= :since')
            ->setParameter('severities', $severities, ArrayParameterType::STRING)
            ->setParameter('since', $since, Types::DATETIME_IMMUTABLE)
            ->orderBy('id', 'DESC')
            ->setMaxResults($limit)
            ->executeQuery()
            ->fetchAllAssociative();

        return array_map($this->entry(...), array_reverse($rows));
    }

    /**
     * @return array<string, array{orders: int, acknowledged: int, updated_last_5_min: int}>
     */
    public function orderStatsByChannel(\DateTimeImmutable $now): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT channel, COUNT(*) AS orders, COUNT(acknowledged_at) AS acknowledged,
                    COUNT(*) FILTER (WHERE last_changed_at >= :recent) AS recent
             FROM orders GROUP BY channel',
            ['recent' => $now->modify('-5 minutes')],
            ['recent' => Types::DATETIME_IMMUTABLE],
        );
        $stats = [];
        foreach ($rows as $row) {
            $stats[Row::string($row, 'channel')] = [
                'orders' => Row::int($row, 'orders'),
                'acknowledged' => Row::int($row, 'acknowledged'),
                'updated_last_5_min' => Row::int($row, 'recent'),
            ];
        }

        return $stats;
    }

    /**
     * @return array<string, int> journal entries per type over the period
     */
    public function eventCounts(\DateTimeImmutable $since): array
    {
        /** @var array<string, int|string> $counts */
        $counts = $this->connection->fetchAllKeyValue(
            'SELECT type, COUNT(*) FROM journal WHERE occurred_at >= :since GROUP BY type ORDER BY type',
            ['since' => $since],
            ['since' => Types::DATETIME_IMMUTABLE],
        );

        return array_map(intval(...), $counts);
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array{id: string, occurred_at: string, channel: ?string, type: string, severity: string, message: string, context: array<string, mixed>}
     */
    private function entry(array $row): array
    {
        return [
            'id' => Row::string($row, 'id'),
            'occurred_at' => $this->iso(Row::string($row, 'occurred_at')),
            'channel' => Row::nullableString($row, 'channel'),
            'type' => Row::string($row, 'type'),
            'severity' => Row::string($row, 'severity'),
            'message' => Row::string($row, 'message'),
            'context' => $this->decode($row['context']),
        ];
    }

    private function iso(string $value): string
    {
        return new \DateTimeImmutable($value, new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
    }

    /**
     * @return array<string, mixed>
     */
    private function decode(mixed $json): array
    {
        $data = \is_string($json) ? json_decode($json, true) : null;
        if (!\is_array($data)) {
            return [];
        }
        $context = [];
        foreach ($data as $key => $value) {
            $context[(string) $key] = $value;
        }

        return $context;
    }
}
