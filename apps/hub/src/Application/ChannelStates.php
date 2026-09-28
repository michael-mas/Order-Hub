<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Channel\ChannelState;

interface ChannelStates
{
    /** Returns the stored state, or a fresh one (persisted on save). */
    public function get(string $channel): ChannelState;

    public function save(ChannelState $state): void;
}
