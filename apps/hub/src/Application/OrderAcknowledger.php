<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Channel\ChannelRegistry;
use App\Domain\Journal\EventType;
use Psr\Clock\ClockInterface;

/**
 * Sends the acknowledgement. Waiting (paused channel, quota) is not a failure:
 * {@see TryAgainLater}, without spending a retry. A marketplace outage is a
 * failure: its exception propagates, to be retried with backoff. A refusal
 * that no retry can change is {@see CannotSucceed}.
 */
final readonly class OrderAcknowledger
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

    public function acknowledge(string $orderId): void
    {
        $order = $this->orders->find($orderId);
        if (null === $order || $order->acknowledged) {
            return;
        }

        $state = $this->states->get($order->channel);
        $now = $this->clock->now();
        if ($state->isPaused()) {
            throw new TryAgainLater('Channel paused.', self::PAUSED_RECHECK_MS);
        }
        if ($state->isThrottled($now) && null !== $state->getThrottledUntil()) {
            $delay = max(1, $state->getThrottledUntil()->getTimestamp() - $now->getTimestamp());
            throw new TryAgainLater('Channel throttled.', $delay * 1000);
        }
        $wait = $this->limiter->acquire($order->channel);
        if ($wait > 0) {
            throw new TryAgainLater('Local quota spent.', $wait * 1000);
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
            throw new TryAgainLater($e->getMessage(), $e->retryAfterSeconds * 1000, $e);
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
                throw new CannotSucceed(\sprintf('Acknowledgement refused: %s.', $result->value));
        }
    }
}
