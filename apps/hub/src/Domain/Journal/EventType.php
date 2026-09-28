<?php

declare(strict_types=1);

namespace App\Domain\Journal;

/**
 * Every decision the hub makes leaves one of these in the journal. The list is
 * closed on purpose: the console, the rule engine and the AI analyst all rely
 * on it.
 */
enum EventType: string
{
    case OrderCreated = 'order.created';
    case OrderUpdated = 'order.updated';
    case OrderUnchanged = 'order.duplicate_ignored';
    case OrderStale = 'order.stale_ignored';
    case OrderInvalid = 'order.invalid_payload';

    case WebhookDuplicate = 'webhook.duplicate';
    case WebhookRejected = 'webhook.rejected';

    case PollCompleted = 'poll.completed';
    case PollFailed = 'poll.failed';
    case RateLimited = 'channel.rate_limited';
    case LocalQuotaReached = 'channel.local_quota_reached';
    case ChannelPaused = 'channel.paused';
    case ChannelResumed = 'channel.resumed';
    case ReconcileRequested = 'channel.reconcile_requested';

    case AckSent = 'ack.sent';
    case AckConflict = 'ack.conflict';

    case MessageRetrying = 'message.retry_scheduled';
    case MessageFailed = 'message.failed';
    case MessageReplayed = 'message.replayed';

    case AnalysisProduced = 'analysis.produced';

    case RetentionApplied = 'retention.applied';

    public function severity(): Severity
    {
        return match ($this) {
            self::OrderCreated, self::OrderUpdated, self::OrderUnchanged, self::WebhookDuplicate,
            self::PollCompleted, self::ChannelResumed, self::ReconcileRequested,
            self::AckSent, self::MessageReplayed, self::AnalysisProduced, self::RetentionApplied => Severity::Info,
            self::OrderStale, self::RateLimited, self::LocalQuotaReached, self::ChannelPaused,
            self::MessageRetrying => Severity::Warning,
            self::OrderInvalid, self::WebhookRejected, self::PollFailed, self::AckConflict,
            self::MessageFailed => Severity::Error,
        };
    }
}
