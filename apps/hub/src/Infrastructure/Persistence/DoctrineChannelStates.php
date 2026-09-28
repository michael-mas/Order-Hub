<?php

declare(strict_types=1);

namespace App\Infrastructure\Persistence;

use App\Application\ChannelStates;
use App\Domain\Channel\ChannelState;
use Doctrine\ORM\EntityManagerInterface;

final readonly class DoctrineChannelStates implements ChannelStates
{
    public function __construct(private EntityManagerInterface $em)
    {
    }

    public function get(string $channel): ChannelState
    {
        return $this->em->find(ChannelState::class, $channel) ?? new ChannelState($channel);
    }

    public function save(ChannelState $state): void
    {
        $this->em->persist($state);
        $this->em->flush();
    }
}
