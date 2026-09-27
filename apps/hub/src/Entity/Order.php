<?php

declare(strict_types=1);

namespace App\Entity;

use ApiPlatform\Doctrine\Orm\Filter\OrderFilter;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Read model of an imported order. Rows are written by {@see \App\Infrastructure\Persistence\OrderStore}
 * in a single atomic upsert, so this entity has no setters.
 */
#[ORM\Entity(readOnly: true)]
#[ORM\Table(name: 'orders')]
#[ORM\UniqueConstraint(name: 'orders_channel_external_id', columns: ['channel', 'external_id'])]
#[ORM\Index(name: 'orders_last_changed_at', columns: ['last_changed_at'])]
#[ApiResource(
    operations: [new GetCollection(order: ['lastChangedAt' => 'DESC']), new Get()],
    description: 'An order imported from a marketplace, at the highest version the hub has seen.',
)]
#[ApiFilter(SearchFilter::class, properties: ['channel' => 'exact', 'status' => 'exact', 'externalId' => 'exact'])]
#[ApiFilter(OrderFilter::class, properties: ['lastChangedAt', 'externalUpdatedAt', 'totalMinor'])]
class Order
{
    /**
     * @param list<array{sku: string, title: string, quantity: int, unit_price_minor: int}> $lines
     */
    public function __construct(
        #[ORM\Id]
        #[ORM\Column(type: 'uuid')]
        private Uuid $id,
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

    public function getId(): Uuid
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
