<?php

declare(strict_types=1);

namespace App\Application\Handler;

use App\Application\AcknowledgementResult;
use App\Application\ChannelRateLimiter;
use App\Application\ChannelStates;
use App\Application\Journal;
use App\Application\MarketplaceClient;
use App\Application\MarketplaceThrottled;
use App\Application\Message\AcknowledgeOrder;
use App\Application\OrderStore;
use App\Domain\Channel\ChannelRegistry;
use App\Domain\Journal\EventType;
use Psr\Clock\ClockInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Messenger\Exception\RecoverableMessageHandlingException;
use Symfony\Component\Messenger\Exception\UnrecoverableMessageHandlingException;

/**
 * Sends the acknowledgement. Waiting (paused channel, quota) is not a failure:
 * the message comes back later without spending a retry. A marketplace outage
 * is a failure: retried with backoff, then parked in the failure queue.
 */
#[AsMessageHandler]
final readonly class AcknowledgeOrderHandler
{
    private const int PAUSED_RECHECK_MS = 30_000;

    public function __construct(
        private OrderStore $orders,
        private ChannelRegistry $channels,
        private ChannelStates $states,
        private ChannelRateLimiter $limiter,
        private MarketplaceClient $client,
        private Journal $journal,
        private ClockInterface $clock,
    ) {
    }

    public function __invoke(AcknowledgeOrder $message): void
    {
        $order = $this->orders->find($message->orderId);
        if (null === $order || $order->acknowledged) {
            return;
        }

        $state = $this->states->get($order->channel);
        $now = $this->clock->now();
        if ($state->isPaused()) {
            throw new RecoverableMessageHandlingException('Channel paused.', retryDelay: self::PAUSED_RECHECK_MS);
        }
        if ($state->isThrottled($now) && null !== $state->getThrottledUntil()) {
            $delay = max(1, $state->getThrottledUntil()->getTimestamp() - $now->getTimestamp());
            throw new RecoverableMessageHandlingException('Channel throttled.', retryDelay: $delay * 1000);
        }
        $wait = $this->limiter->acquire($order->channel);
        if ($wait > 0) {
            throw new RecoverableMessageHandlingException('Local quota spent.', retryDelay: $wait * 1000);
        }

        try {
            $result = $this->client->acknowledge($this->channels->get($order->channel), $order->externalId, $order->id);
        } catch (MarketplaceThrottled $e) {
            $state->throttleUntil($now->modify(\sprintf('+%d seconds', $e->retryAfterSeconds)));
            $this->states->save($state);
            $this->journal->record(EventType::RateLimited, \sprintf('Marketplace quota exceeded while acknowledging: channel paused for %d s.', $e->retryAfterSeconds), $order->channel, [
                'retry_after_seconds' => $e->retryAfterSeconds,
                'external_id' => $order->externalId,
            ]);
            throw new RecoverableMessageHandlingException($e->getMessage(), previous: $e, retryDelay: $e->retryAfterSeconds * 1000);
        }

        switch ($result) {
            case AcknowledgementResult::Acknowledged:
            case AcknowledgementResult::AlreadyAcknowledged:
                $this->orders->markAcknowledged($order->id, $now);
                $this->journal->record(EventType::AckSent, \sprintf('%s acknowledged to the marketplace.', $order->externalId), $order->channel, [
                    'order_id' => $order->id,
                    'external_id' => $order->externalId,
                    'result' => $result->value,
                ]);

                return;
            case AcknowledgementResult::Conflict:
            case AcknowledgementResult::UnknownOrder:
                $this->journal->record(EventType::AckConflict, \sprintf('%s could not be acknowledged: %s.', $order->externalId, str_replace('_', ' ', $result->value)), $order->channel, [
                    'order_id' => $order->id,
                    'external_id' => $order->externalId,
                    'result' => $result->value,
                ]);
                // Retrying cannot change the answer: straight to the failure queue.
                throw new UnrecoverableMessageHandlingException(\sprintf('Acknowledgement refused: %s.', $result->value));
        }
    }
}
