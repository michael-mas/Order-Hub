<?php

declare(strict_types=1);

namespace App\Infrastructure\Messenger;

use App\Application\Journal;
use App\Domain\Journal\EventType;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\Messenger\Event\WorkerMessageFailedEvent;
use Symfony\Component\Messenger\Exception\HandlerFailedException;
use Symfony\Component\Messenger\Exception\RecoverableExceptionInterface;
use Symfony\Component\Messenger\Stamp\RedeliveryStamp;

/**
 * Makes retries and dead letters visible in the journal. Planned waits
 * (paused or throttled channel) are not failures and stay out of it.
 */
#[AsEventListener]
final readonly class JournalFailedMessages
{
    public function __construct(private Journal $journal)
    {
    }

    public function __invoke(WorkerMessageFailedEvent $event): void
    {
        $error = $event->getThrowable();
        $root = $error instanceof HandlerFailedException ? ($error->getPrevious() ?? $error) : $error;
        if ($event->willRetry() && $root instanceof RecoverableExceptionInterface) {
            return;
        }

        $message = $event->getEnvelope()->getMessage();
        $attempt = ($event->getEnvelope()->last(RedeliveryStamp::class)?->getRetryCount() ?? 0) + 1;
        $channel = MessageDescription::channel($message);
        $context = [
            'message' => MessageDescription::type($message),
            'attempt' => $attempt,
            'error' => mb_substr($root->getMessage(), 0, 500),
            'order_id' => MessageDescription::orderId($message),
        ];

        if ($event->willRetry()) {
            $this->journal->record(EventType::MessageRetrying, \sprintf('%s failed (attempt %d), retry scheduled.', $context['message'], $attempt), $channel, $context);
        } else {
            $this->journal->record(EventType::MessageFailed, \sprintf('%s moved to the failure queue after %d attempt(s).', $context['message'], $attempt), $channel, $context);
        }
    }
}
