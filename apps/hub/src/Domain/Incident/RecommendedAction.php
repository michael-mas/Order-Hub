<?php

declare(strict_types=1);

namespace App\Domain\Incident;

/**
 * The closed list of what the analyst may recommend. Each maps to an
 * operation a human can trigger from the console; nothing else exists.
 */
enum RecommendedAction: string
{
    case ReplayFailedMessages = 'replay_failed_messages';
    case PauseChannel = 'pause_channel';
    case ResumeChannel = 'resume_channel';
    case ReconcileChannel = 'reconcile_channel';
    case None = 'none';

    public function needsChannel(): bool
    {
        return match ($this) {
            self::PauseChannel, self::ResumeChannel, self::ReconcileChannel => true,
            self::ReplayFailedMessages, self::None => false,
        };
    }
}
