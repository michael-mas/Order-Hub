<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * One row per webhook event id ever accepted. The primary key is the
 * deduplication: a second insert of the same id is a duplicate delivery.
 */
#[ORM\Entity(readOnly: true)]
#[ORM\Table(name: 'webhook_events')]
#[ORM\Index(name: 'webhook_events_received_at', columns: ['received_at'])]
class WebhookEvent
{
    public function __construct(
        #[ORM\Id]
        #[ORM\Column(length: 32)]
        private string $channel,
        #[ORM\Id]
        #[ORM\Column(length: 128)]
        private string $eventId,
        #[ORM\Column]
        private \DateTimeImmutable $receivedAt,
    ) {
    }

    public function getChannel(): string
    {
        return $this->channel;
    }

    public function getEventId(): string
    {
        return $this->eventId;
    }

    public function getReceivedAt(): \DateTimeImmutable
    {
        return $this->receivedAt;
    }
}
