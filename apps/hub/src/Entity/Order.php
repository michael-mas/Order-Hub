<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\ExactFilter;
use ApiPlatform\Doctrine\Orm\Filter\SortFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\QueryParameter;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Read model of an imported order. Rows are written by the persistence adapter (OrderStore)
 * in a single atomic upsert, so this entity has no setters.
 */
#[ORM\Entity(readOnly: true)]
#[ORM\Table(name: 'orders')]
#[ORM\UniqueConstraint(name: 'orders_channel_external_id', columns: ['channel', 'external_id'])]
#[ORM\Index(name: 'orders_last_changed_at', columns: ['last_changed_at'])]
#[ApiResource(
    // The id (UUID v7, unique) breaks ties: without a total order, orders
    // changed in the same second could repeat or vanish across pages.
    operations: [
        new GetCollection(
            order: ['lastChangedAt' => 'DESC', 'id' => 'DESC'],
            parameters: [
                'channel' => new QueryParameter(filter: new ExactFilter(), property: 'channel'),
                'status' => new QueryParameter(filter: new ExactFilter(), property: 'status'),
                'externalId' => new QueryParameter(filter: new ExactFilter(), property: 'externalId'),
                'order[:property]' => new QueryParameter(
                    filter: new SortFilter(),
                    properties: ['id', 'lastChangedAt', 'externalUpdatedAt', 'totalMinor'],
                ),
            ],
        ),
        new Get(),
    ],
    description: 'An order imported from a marketplace, at the highest version the hub has seen.',
)]
class Order
{
    /**
     * @param list<array{sku: string, title: string, quantity: int, unit_price_minor: int}> $lines
     */
    public function __construct(
        /** UUID v7, as text: native UUID on PostgreSQL, CHAR(36) on SQLite. */
        #[ORM\Id]
        #[ORM\Column(type: Types::GUID)]
        private string $id,
        #[ORM\Column(length: 32)]
        private string $channel,
        #[ORM\Column(length: 64)]
        private string $externalId,
        #[ORM\Column(length: 16)]
        private string $status,
        #[ORM\Column(length: 3)]
        private string $currency,
        #[ORM\Column]
        private int $totalMinor,
        #[ORM\Column(type: Types::JSON)]
        private array $lines,
        #[ORM\Column(length: 128)]
        private string $buyerDisplayName,
        #[ORM\Column]
        private \DateTimeImmutable $externalCreatedAt,
        #[ORM\Column]
        private \DateTimeImmutable $externalUpdatedAt,
        #[ORM\Column]
        private int $version,
        #[ORM\Column(length: 16)]
        private string $firstSource,
        #[ORM\Column]
        private \DateTimeImmutable $firstSeenAt,
        #[ORM\Column]
        private \DateTimeImmutable $lastChangedAt,
        #[ORM\Column(nullable: true)]
        private ?\DateTimeImmutable $acknowledgedAt = null,
    ) {
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getChannel(): string
    {
        return $this->channel;
    }

    public function getExternalId(): string
    {
        return $this->externalId;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function getCurrency(): string
    {
        return $this->currency;
    }

    public function getTotalMinor(): int
    {
        return $this->totalMinor;
    }

    /**
     * @return list<array{sku: string, title: string, quantity: int, unit_price_minor: int}>
     */
    public function getLines(): array
    {
        return $this->lines;
    }

    public function getBuyerDisplayName(): string
    {
        return $this->buyerDisplayName;
    }

    public function getExternalCreatedAt(): \DateTimeImmutable
    {
        return $this->externalCreatedAt;
    }

    public function getExternalUpdatedAt(): \DateTimeImmutable
    {
        return $this->externalUpdatedAt;
    }

    public function getVersion(): int
    {
        return $this->version;
    }

    /** How the hub first learnt about the order: webhook, poll or reconcile. */
    public function getFirstSource(): string
    {
        return $this->firstSource;
    }

    public function getFirstSeenAt(): \DateTimeImmutable
    {
        return $this->firstSeenAt;
    }

    public function getLastChangedAt(): \DateTimeImmutable
    {
        return $this->lastChangedAt;
    }

    public function getAcknowledgedAt(): ?\DateTimeImmutable
    {
        return $this->acknowledgedAt;
    }
}
