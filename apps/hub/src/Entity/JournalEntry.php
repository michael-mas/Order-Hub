<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Append-only. Rows are inserted by the persistence adapter (DbalJournal)
 * inside the transaction of the decision they record; this class only maps the table.
 */
#[ORM\Entity(readOnly: true)]
#[ORM\Table(name: 'journal')]
#[ORM\Index(name: 'journal_occurred_at', columns: ['occurred_at'])]
#[ORM\Index(name: 'journal_severity', columns: ['severity', 'id'])]
class JournalEntry
{
    /**
     * @param array<string, mixed> $context
     */
    public function __construct(
        #[ORM\Id]
        #[ORM\GeneratedValue(strategy: 'IDENTITY')]
        #[ORM\Column(type: Types::BIGINT)]
        private string $id,
        #[ORM\Column]
        private \DateTimeImmutable $occurredAt,
        #[ORM\Column(length: 32, nullable: true)]
        private ?string $channel,
        #[ORM\Column(length: 48)]
        private string $type,
        #[ORM\Column(length: 8)]
        private string $severity,
        #[ORM\Column(type: Types::TEXT)]
        private string $message,
        #[ORM\Column(type: Types::JSON)]
        private array $context,
    ) {
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getOccurredAt(): \DateTimeImmutable
    {
        return $this->occurredAt;
    }

    public function getChannel(): ?string
    {
        return $this->channel;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getSeverity(): string
    {
        return $this->severity;
    }

    public function getMessage(): string
    {
        return $this->message;
    }

    /**
     * @return array<string, mixed>
     */
    public function getContext(): array
    {
        return $this->context;
    }
}
