<?php

declare(strict_types=1);

namespace App\Domain\Incident;

use App\Domain\Journal\EventType;

/**
 * The analyst that needs no model: deterministic rules over the journal. It
 * answers when no API key is configured, when the model is unavailable, and
 * in every test. Same output shape as the model, same sanitizer.
 */
final class RuleBasedAnalyst implements Analyst
{
    public const string ENGINE = 'rules';

    private const int THROTTLE_THRESHOLD = 3;
    private const int UPSTREAM_ERROR_THRESHOLD = 3;
    private const int PAUSE_THRESHOLD = 10;
    private const int EVIDENCE = 5;

    public function analyze(IncidentContext $context): Analysis
    {
        $findings = [];
        $recommendations = [];
        $score = 0;

        $failed = $context->eventsOfType(EventType::MessageFailed->value);
        if ($context->failedMessages > 0) {
            $score += 2;
            $findings[] = new Finding(
                \sprintf('%d message(s) in the failure queue', $context->failedMessages),
                'These messages exhausted their retries. Until they are replayed, the matching orders stay unacknowledged on the marketplace side.',
                self::ids($failed),
            );
            $recommendations[] = new Recommendation(
                RecommendedAction::ReplayFailedMessages,
                null,
                'Replay once the marketplace answers normally again; acknowledgements are idempotent, so a replay cannot acknowledge twice.',
            );
        }

        $invalid = $context->eventsOfType(EventType::OrderInvalid->value);
        if ([] !== $invalid) {
            $score += 2;
            $findings[] = new Finding(
                \sprintf('%d order payload(s) rejected as invalid', \count($invalid)),
                'The marketplace sent orders the hub refuses to store. This usually means its contract changed: the payloads need a look before anything else.',
                self::ids($invalid),
            );
        }

        $rejected = $context->eventsOfType(EventType::WebhookRejected->value);
        if ([] !== $rejected) {
            $score += 2;
            $findings[] = new Finding(
                \sprintf('%d webhook(s) refused', \count($rejected)),
                'Deliveries failed signature or format checks. Either the shared secret was rotated on one side only, or someone is sending forged requests. Polling keeps orders flowing meanwhile.',
                self::ids($rejected),
            );
        }

        foreach ($context->channels as $channel) {
            $code = $channel['code'];

            $throttled = $context->eventsOfType(EventType::RateLimited->value, $code);
            if (\count($throttled) >= self::THROTTLE_THRESHOLD) {
                ++$score;
                $findings[] = new Finding(
                    \sprintf('%s hit its marketplace quota %d time(s)', $code, \count($throttled)),
                    'The marketplace answered 429. The hub backs off for the Retry-After it was given, so imports on this channel are delayed, not lost.',
                    self::ids($throttled),
                );
                $recommendations[] = new Recommendation(
                    RecommendedAction::ReconcileChannel,
                    $code,
                    'Once the quota recovers, a reconciliation sweep catches up the backlog in one pass instead of waiting for the regular window.',
                );
            }

            $upstream = array_merge(
                $context->eventsOfType(EventType::PollFailed->value, $code),
                $context->eventsOfType(EventType::MessageRetrying->value, $code),
            );
            if (\count($upstream) >= self::UPSTREAM_ERROR_THRESHOLD) {
                $score += \count($upstream) >= self::PAUSE_THRESHOLD ? 3 : 1;
                $findings[] = new Finding(
                    \sprintf('%s is unstable (%d failed call(s))', $code, \count($upstream)),
                    'Calls to the marketplace fail with server errors or timeouts. Retries absorb short outages; a long one fills the failure queue.',
                    self::ids($upstream),
                );
                if (\count($upstream) >= self::PAUSE_THRESHOLD && !$channel['paused']) {
                    $recommendations[] = new Recommendation(
                        RecommendedAction::PauseChannel,
                        $code,
                        'Pausing stops spending retries against an outage. Nothing is lost: polling resumes from its checkpoint and pending acknowledgements wait.',
                    );
                }
            }

            if ($channel['paused'] && [] === $upstream) {
                $pausedEvents = $context->eventsOfType(EventType::ChannelPaused->value, $code);
                $findings[] = new Finding(
                    \sprintf('%s is paused', $code),
                    'No recent failure justifies the pause any more: orders from this channel are not being imported.',
                    self::ids($pausedEvents),
                );
                $recommendations[] = new Recommendation(RecommendedAction::ResumeChannel, $code, 'The channel looks healthy again.');
            }
        }

        $absorbed = array_merge(
            $context->eventsOfType(EventType::WebhookDuplicate->value),
            $context->eventsOfType(EventType::OrderUnchanged->value),
            $context->eventsOfType(EventType::OrderStale->value),
        );
        if ([] !== $absorbed) {
            $findings[] = new Finding(
                \sprintf('%d duplicate or out-of-order deliveries absorbed', \count($absorbed)),
                'Duplicated webhooks and late versions were recognised and ignored. This is the deduplication working as designed, not a problem.',
                self::ids($absorbed),
            );
        }

        $level = match (true) {
            $score >= 3 => IncidentLevel::Incident,
            $score > 0 => IncidentLevel::Degraded,
            default => IncidentLevel::Ok,
        };
        if ([] === $recommendations) {
            $recommendations[] = new Recommendation(RecommendedAction::None, null, 'Nothing requires an operator right now.');
        }

        return new Analysis(self::ENGINE, $level, self::summary($level, $findings), $findings, $recommendations);
    }

    /**
     * @param list<Finding> $findings
     */
    private static function summary(IncidentLevel $level, array $findings): string
    {
        return match ($level) {
            IncidentLevel::Ok => [] === $findings
                ? 'No incident in the window: orders flow normally.'
                : 'No incident: the hub absorbed the disturbances it met.',
            IncidentLevel::Degraded => \sprintf('Degraded: %s.', lcfirst($findings[0]->title ?? 'see findings')),
            IncidentLevel::Incident => \sprintf('Incident: %s.', implode('; ', array_map(
                static fn (Finding $f): string => lcfirst($f->title),
                \array_slice($findings, 0, 3),
            ))),
        };
    }

    /**
     * @param list<array{id: string}> $events
     *
     * @return list<string>
     */
    private static function ids(array $events): array
    {
        // The most recent entries are the most useful evidence.
        $ids = array_column($events, 'id');
        usort($ids, static fn (string $a, string $b): int => (int) $b <=> (int) $a);

        return \array_slice($ids, 0, self::EVIDENCE);
    }
}
