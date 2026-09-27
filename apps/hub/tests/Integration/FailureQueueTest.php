<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Application\FailedMessages;
use App\Application\Message\AcknowledgeOrder;
use Symfony\Component\Messenger\Envelope;
use Symfony\Component\Messenger\Stamp\ErrorDetailsStamp;
use Symfony\Component\Messenger\Stamp\RedeliveryStamp;
use Symfony\Component\Messenger\Transport\TransportInterface;

final class FailureQueueTest extends DatabaseTestCase
{
    public function testListsAndReplaysDeadLetters(): void
    {
        $failedTransport = static::getContainer()->get('messenger.transport.failed');
        \assert($failedTransport instanceof TransportInterface);
        $failedTransport->send(new Envelope(new AcknowledgeOrder('01890000-0000-7000-8000-000000000001', 'atlas'), [
            new RedeliveryStamp(1),
            new RedeliveryStamp(2),
            new ErrorDetailsStamp(\RuntimeException::class, 0, 'Marketplace answered 503.'),
        ]));
        $queue = self::service(FailedMessages::class);

        self::assertSame(1, $queue->count());
        $message = $queue->list()[0];
        self::assertSame('AcknowledgeOrder', $message->type);
        self::assertSame('atlas', $message->channel);
        self::assertSame('Marketplace answered 503.', $message->error);
        self::assertSame(2, $message->attempts);

        self::assertTrue($queue->replay($message->id));
        self::assertSame(0, $queue->count());
        self::assertInstanceOf(AcknowledgeOrder::class, $this->queued()[0]);
        self::assertSame(['message.replayed'], $this->journalTypes('atlas'));
        self::assertFalse($queue->replay($message->id), 'A message is replayed once.');
    }
}
