<?php

declare(strict_types=1);

namespace App\Infrastructure\Messenger;

use App\Application\Message\PollChannel;
use App\Domain\Channel\ChannelRegistry;
use App\Domain\Channel\PollMode;
use Symfony\Component\Scheduler\Attribute\AsSchedule;
use Symfony\Component\Scheduler\RecurringMessage;
use Symfony\Component\Scheduler\Schedule;
use Symfony\Component\Scheduler\ScheduleProviderInterface;

/**
 * Short, frequent windows for freshness; a wide reconciliation for
 * completeness (ADR 0003). Consumed by the worker: `messenger:consume
 * scheduler_default async`.
 */
#[AsSchedule]
final class HubSchedule implements ScheduleProviderInterface
{
    public const int RECONCILE_EVERY_SECONDS = 120;

    public function __construct(private readonly ChannelRegistry $channels)
    {
    }

    public function getSchedule(): Schedule
    {
        $schedule = new Schedule();
        foreach ($this->channels->all() as $channel) {
            $schedule->add(
                RecurringMessage::every(\sprintf('%d seconds', $channel->pollIntervalSeconds), new PollChannel($channel->code, PollMode::Window)),
                RecurringMessage::every(\sprintf('%d seconds', self::RECONCILE_EVERY_SECONDS), new PollChannel($channel->code, PollMode::Reconcile)),
            );
        }

        return $schedule;
    }
}
