<?php

declare(strict_types=1);

namespace App\Infrastructure\Messenger;

use App\Application\FailedMessage;
use App\Application\FailedMessages;
use App\Application\Journal;
use App\Domain\Journal\EventType;
use App\Infrastructure\Persistence\Row;
use Doctrine\DBAL\Connection;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Messenger\Envelope;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Messenger\Stamp\ErrorDetailsStamp;
use Symfony\Component\Messenger\Stamp\RedeliveryStamp;
use Symfony\Component\Messenger\Stamp\TransportMessageIdStamp;
use Symfony\Component\Messenger\Transport\Receiver\ListableReceiverInterface;
use Symfony\Component\Messenger\Transport\Receiver\MessageCountAwareInterface;
use Symfony\Component\Messenger\Transport\TransportInterface;

final readonly class FailureQueue implements FailedMessages
{
    private const int REPLAY_ALL_LIMIT = 500;

    public function __construct(
        #[Autowire(service: 'messenger.transport.failed')]
        private TransportInterface $transport,
        private MessageBusInterface $bus,
        private Connection $connection,
        private Journal $journal,
    ) {
    }

    public function count(): int
    {
        return $this->transport instanceof MessageCountAwareInterface ? $this->transport->getMessageCount() : 0;
    }

    public function list(int $limit = 50): array
    {
        $views = [];
        foreach ($this->listable()->all($limit) as $envelope) {
            $views[] = $this->view($envelope);
        }

        return $views;
    }

    public function replay(string $id): bool
    {
        $envelope = $this->listable()->find($id);
        if (null === $envelope) {
            return false;
        }
        $this->replayEnvelope($envelope);

        return true;
    }

    public function replayAll(): int
    {
        $count = 0;
        foreach ($this->listable()->all(self::REPLAY_ALL_LIMIT) as $envelope) {
            $this->replayEnvelope($envelope);
            ++$count;
        }

        return $count;
    }

    private function replayEnvelope(Envelope $envelope): void
    {
        $view = $this->view($envelope);
        // Same database, same transaction: the message leaves the failure
        // queue and re-enters its queue atomically, never both, never neither.
        $this->connection->transactional(function () use ($envelope, $view): void {
            $this->bus->dispatch($envelope->getMessage());
            $this->transport->reject($envelope);
            $this->journal->record(EventType::MessageReplayed, \sprintf('%s replayed by an operator.', $view->type), $view->channel, [
                'failed_message_id' => $view->id,
                'order_id' => $view->orderId,
            ]);
        });
    }

    private function view(Envelope $envelope): FailedMessage
    {
        $message = $envelope->getMessage();
        $error = $envelope->last(ErrorDetailsStamp::class);

        return new FailedMessage(
            Row::scalarToString($envelope->last(TransportMessageIdStamp::class)?->getId() ?? ''),
            MessageDescription::type($message),
            MessageDescription::channel($message),
            MessageDescription::orderId($message),
            $error?->getExceptionMessage() ?? 'unknown error',
            max(1, \count($envelope->all(RedeliveryStamp::class))),
            ($at = $envelope->last(RedeliveryStamp::class)?->getRedeliveredAt()) ? \DateTimeImmutable::createFromInterface($at) : null,
        );
    }

    private function listable(): ListableReceiverInterface
    {
        if (!$this->transport instanceof ListableReceiverInterface) {
            throw new \LogicException('The failure transport must be listable (Doctrine).');
        }

        return $this->transport;
    }
}
