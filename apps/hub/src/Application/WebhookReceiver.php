<?php

declare(strict_types=1);

namespace App\Application;

use App\Application\Message\IngestOrder;
use App\Domain\Channel\ChannelRegistry;
use App\Domain\Journal\EventType;
use App\Domain\Order\ExternalOrder;
use App\Domain\Order\InvalidOrderPayload;
use App\Domain\Webhook\SignatureCheck;
use App\Domain\Webhook\WebhookSignature;
use Psr\Clock\ClockInterface;

/**
 * Verifies, deduplicates and queues a webhook. Ingestion itself happens in a
 * worker: a marketplace that waits too long for an answer sends again.
 */
class WebhookReceiver
{
    public function __construct(
        private readonly ChannelRegistry $channels,
        private readonly WebhookEventStore $events,
        private readonly Journal $journal,
        private readonly MessageDispatcher $messages,
        private readonly Transactions $transactions,
        private readonly ClockInterface $clock,
    ) {
    }

    public function receive(string $channelCode, string $rawBody, string $signature, string $eventIdHeader): WebhookResult
    {
        if (!$this->channels->has($channelCode) || !$this->channels->get($channelCode)->supportsWebhooks) {
            return WebhookResult::UnknownChannel;
        }
        $channel = $this->channels->get($channelCode);

        // The signature is checked on the raw bytes, before any parsing.
        $check = WebhookSignature::verify($channel->webhookSecret, $signature, $rawBody, $this->clock->now()->getTimestamp());
        if (SignatureCheck::Valid !== $check) {
            $this->journal->record(EventType::WebhookRejected, \sprintf('Webhook refused: signature %s.', $check->value), $channelCode, [
                'reason' => $check->value,
                'event_id' => '' !== $eventIdHeader ? mb_substr($eventIdHeader, 0, 128) : null,
            ]);

            return WebhookResult::Unauthorized;
        }

        $event = json_decode($rawBody, true);
        $eventId = \is_array($event) && \is_string($event['event_id'] ?? null) ? $event['event_id'] : '';
        $order = \is_array($event) && \is_array($event['order'] ?? null) ? $event['order'] : null;
        if ('' === $eventId || mb_strlen($eventId) > 128 || $eventId !== $eventIdHeader || null === $order) {
            $this->journal->record(EventType::WebhookRejected, 'Webhook refused: malformed event.', $channelCode, [
                'reason' => 'malformed',
            ]);

            return WebhookResult::Invalid;
        }

        try {
            ExternalOrder::fromPayload($order);
        } catch (InvalidOrderPayload $e) {
            $this->journal->record(EventType::OrderInvalid, $e->getMessage(), $channelCode, [
                'source' => 'webhook',
                'event_id' => $eventId,
                'field' => $e->field,
            ]);

            return WebhookResult::Invalid;
        }

        return $this->transactions->run(function () use ($channelCode, $eventId, $order): WebhookResult {
            if (!$this->events->remember($channelCode, $eventId, $this->clock->now())) {
                $this->journal->record(
                    EventType::WebhookDuplicate,
                    \sprintf('Event %s delivered again: ignored.', $eventId),
                    $channelCode,
                    ['event_id' => $eventId],
                );

                return WebhookResult::Duplicate;
            }
            $this->messages->dispatch(new IngestOrder($channelCode, $order, $eventId));

            return WebhookResult::Accepted;
        });
    }
}
