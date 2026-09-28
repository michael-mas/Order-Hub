<?php

declare(strict_types=1);

namespace App\Infrastructure\Messenger\Handler;

use App\Application\Message\IngestOrder;
use App\Application\OrderIngestor;
use App\Domain\Order\IngestionSource;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final readonly class IngestOrderHandler
{
    public function __construct(private OrderIngestor $ingestor)
    {
    }

    public function __invoke(IngestOrder $message): void
    {
        $this->ingestor->ingest($message->channel, $message->payload, IngestionSource::Webhook, $message->eventId);
    }
}
