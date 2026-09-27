<?php

declare(strict_types=1);

namespace App\Domain\Channel;

final class ChannelRegistry
{
    /** @var array<string, Channel> */
    private array $channels = [];

    /**
     * @param iterable<Channel> $channels
     */
    public function __construct(iterable $channels)
    {
        foreach ($channels as $channel) {
            if (isset($this->channels[$channel->code])) {
                throw new \InvalidArgumentException(\sprintf('Duplicate channel "%s".', $channel->code));
            }
            $this->channels[$channel->code] = $channel;
        }
    }

    public function get(string $code): Channel
    {
        return $this->channels[$code] ?? throw new UnknownChannel($code);
    }

    public function has(string $code): bool
    {
        return isset($this->channels[$code]);
    }

    /**
     * @return list<Channel>
     */
    public function all(): array
    {
        return array_values($this->channels);
    }
}
