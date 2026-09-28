<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Channel\ChannelRegistry;
use App\Domain\Incident\AnalysisSanitizer;
use App\Domain\Incident\AnalystUnavailable;
use App\Domain\Incident\IncidentContext;
use App\Domain\Incident\RuleBasedAnalyst;
use App\Domain\Journal\EventType;
use App\Domain\Journal\Severity;
use Psr\Clock\ClockInterface;

/**
 * Builds the evidence, asks the model when one is configured, falls back to
 * the rule engine otherwise, and sanitizes whatever comes back.
 */
class IncidentAnalyzer
{
    public const int WINDOW_MINUTES = 30;
    public const int MAX_EVIDENCE = 120;

    /** Routine entries: counted for the analyst, not handed over one by one. */
    private const array ROUTINE = [
        EventType::OrderCreated,
        EventType::OrderUpdated,
        EventType::AckSent,
        EventType::PollCompleted,
        EventType::AnalysisProduced,
    ];

    public function __construct(
        private readonly JournalReader $journalReader,
        private readonly ChannelRegistry $channels,
        private readonly ChannelStates $states,
        private readonly FailedMessages $failed,
        private readonly ModelAnalyst $model,
        private readonly ModelBudget $budget,
        private readonly Journal $journal,
        private readonly ClockInterface $clock,
    ) {
    }

    public function analyze(): IncidentReport
    {
        $context = $this->context();

        $fallbackReason = null;
        $analysis = null;
        if (!$this->model->isConfigured()) {
            $fallbackReason = 'No model configured.';
        } elseif (!$this->budget->spend()) {
            $fallbackReason = \sprintf('Today\'s budget of %d model analyses is spent.', $this->budget->dailyLimit());
        } else {
            try {
                $analysis = $this->model->analyze($context);
            } catch (AnalystUnavailable $e) {
                $fallbackReason = $e->getMessage();
            }
        }
        $analysis ??= new RuleBasedAnalyst()->analyze($context)->withEngine(RuleBasedAnalyst::ENGINE, $fallbackReason);

        $analysis = AnalysisSanitizer::sanitize($analysis, $context);
        $this->journal->record(EventType::AnalysisProduced, \sprintf('Incident analysis (%s): %s', $analysis->engine, $analysis->level->value), null, [
            'engine' => $analysis->engine,
            'level' => $analysis->level->value,
            'findings' => \count($analysis->findings),
            'discarded' => $analysis->discarded,
        ]);

        return IncidentReport::of($analysis, $context->events);
    }

    public function context(): IncidentContext
    {
        $now = $this->clock->now();
        $since = $now->modify(\sprintf('-%d minutes', self::WINDOW_MINUTES));
        $routine = array_map(static fn (EventType $t): string => $t->value, self::ROUTINE);
        $events = array_values(array_filter(
            $this->journalReader->journalSince($since, Severity::Info, self::MAX_EVIDENCE * 4),
            static fn (array $e): bool => !\in_array($e['type'], $routine, true),
        ));
        $events = \array_slice($events, -self::MAX_EVIDENCE);

        $stats = $this->journalReader->orderStatsByChannel($now);
        $channels = [];
        foreach ($this->channels->all() as $channel) {
            $state = $this->states->get($channel->code);
            $channels[] = [
                'code' => $channel->code,
                'paused' => $state->isPaused(),
                'throttled' => $state->isThrottled($now),
                'orders' => $stats[$channel->code]['orders'] ?? 0,
                'acknowledged' => $stats[$channel->code]['acknowledged'] ?? 0,
            ];
        }

        return new IncidentContext($now, self::WINDOW_MINUTES, $events, $channels, $this->failed->count(), $this->journalReader->eventCounts($since));
    }
}
