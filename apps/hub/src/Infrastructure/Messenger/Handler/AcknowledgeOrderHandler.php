<?php

declare(strict_types=1);

namespace App\Infrastructure\Messenger\Handler;

use App\Application\CannotSucceed;
use App\Application\Message\AcknowledgeOrder;
use App\Application\OrderAcknowledger;
use App\Application\TryAgainLater;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Messenger\Exception\RecoverableMessageHandlingException;
use Symfony\Component\Messenger\Exception\UnrecoverableMessageHandlingException;

/**
 * Translates the use case's outcomes into Messenger's retry semantics:
 * waiting comes back after its delay without spending a retry; a hopeless
 * refusal goes straight to the failure queue; anything else is retried with
 * backoff (config/packages/messenger.yaml).
 */
#[AsMessageHandler]
final readonly class AcknowledgeOrderHandler
{
    public function __construct(private OrderAcknowledger $acknowledger)
    {
    }

    public function __invoke(AcknowledgeOrder $message): void
    {
        try {
            $this->acknowledger->acknowledge($message->orderId);
        } catch (TryAgainLater $e) {
            throw new RecoverableMessageHandlingException($e->getMessage(), 0, $e, retryDelay: $e->delayMs);
        } catch (CannotSucceed $e) {
            throw new UnrecoverableMessageHandlingException($e->getMessage(), 0, $e);
        }
    }
}
