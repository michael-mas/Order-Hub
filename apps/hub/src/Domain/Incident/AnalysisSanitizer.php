<?php

declare(strict_types=1);

namespace App\Domain\Incident;

/**
 * The guard between any analyst and the operator (ADR 0004): a finding must
 * cite journal entries that were actually provided, a recommendation must name
 * a known channel when it needs one and make sense in the current state.
 * Whatever fails is dropped and counted, never shown.
 */
final class AnalysisSanitizer
{
    public const int MAX_EVIDENCE_PER_FINDING = 10;

    public static function sanitize(Analysis $analysis, IncidentContext $context): Analysis
    {
        $known = $context->evidenceIds();
        $channels = array_fill_keys($context->channelCodes(), true);
        $discarded = $analysis->discarded;

        $findings = [];
        foreach ($analysis->findings as $finding) {
            $evidence = array_values(array_unique(array_filter($finding->evidence, static fn (string $id): bool => isset($known[$id]))));
            if ([] === $evidence) {
                ++$discarded;
                continue;
            }
            $findings[] = new Finding(
                self::clip($finding->title, 120),
                self::clip($finding->explanation, 1000),
                \array_slice($evidence, 0, self::MAX_EVIDENCE_PER_FINDING),
            );
        }

        $recommendations = [];
        $seen = [];
        foreach ($analysis->recommendations as $recommendation) {
            $channel = $recommendation->action->needsChannel() ? $recommendation->channel : null;
            $valid = match (true) {
                $recommendation->action->needsChannel() => null !== $channel && isset($channels[$channel]),
                RecommendedAction::ReplayFailedMessages === $recommendation->action => $context->failedMessages > 0,
                default => true,
            };
            $key = $recommendation->action->value.'/'.($channel ?? '');
            if (!$valid || isset($seen[$key])) {
                ++$discarded;
                continue;
            }
            $seen[$key] = true;
            $recommendations[] = new Recommendation($recommendation->action, $channel, self::clip($recommendation->rationale, 500));
        }

        return new Analysis(
            $analysis->engine,
            $analysis->level,
            self::clip($analysis->summary, 600),
            $findings,
            $recommendations,
            $discarded,
            $analysis->fallbackReason,
        );
    }

    private static function clip(string $text, int $max): string
    {
        $text = trim($text);

        return mb_strlen($text) > $max ? mb_substr($text, 0, $max - 1).'…' : $text;
    }
}
