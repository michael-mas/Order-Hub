<?php

declare(strict_types=1);

namespace App\Application;

use App\Application\Message\PollChannel;
use App\Domain\Channel\ChannelRegistry;
use App\Domain\Channel\PollMode;
use App\Domain\Journal\EventType;
use Doctrine\DBAL\Connection;
use Symfony\Component\Messenger\MessageBusInterface;

/**
 * What an operator can do to a channel. The incident analyst only ever
 * recommends these; a human triggers them (ADR 0004).
 */
class ChannelOperations
{
    public function __construct(
        private readonly ChannelRegistry $channels,
        private readonly ChannelStates $states,
        private readonly Journal $journal,
        private readonly MessageBusInterface $bus,
        private readonly Connection $connection,
    ) {
    }

    public function pause(string $channel): void
    {
        $this->channels->get($channel);
        $this->connection->transactional(function () use ($channel): void {
            $state = $this->states->get($channel);
            if ($state->isPaused()) {
                return;
            }
            $state->pause();
            $this->states->save($state);
            $this->journal->record(EventType::ChannelPaused, 'Channel paused by an operator: no poll, no acknowledgement.', $channel);
        });
    }

    public function resume(string $channel): void
    {
        $this->channels->get($channel);
        $this->connection->transactional(function () use ($channel): void {
            $state = $this->states->get($channel);
            if (!$state->isPaused() && null === $state->getThrottledUntil()) {
                return;
            }
            $state->resume();
            $this->states->save($state);
            $this->journal->record(EventType::ChannelResumed, 'Channel resumed by an operator.', $channel);
        });
    }

    public function reconcile(string $channel): void
    {
        $this->channels->get($channel);
        $this->connection->transactional(function () use ($channel): void {
            $this->bus->dispatch(new PollChannel($channel, PollMode::Reconcile));
            $this->journal->record(EventType::ReconcileRequested, 'Reconciliation requested by an operator.', $channel);
        });
    }
}
