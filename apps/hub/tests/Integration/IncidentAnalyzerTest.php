<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Application\IncidentAnalyzer;
use App\Application\Journal;
use App\Domain\Incident\AnalystUnavailable;
use App\Domain\Journal\EventType;

final class IncidentAnalyzerTest extends DatabaseTestCase
{
    public function testUsesTheRuleEngineWhenNoModelIsConfigured(): void
    {
        $analysis = self::service(IncidentAnalyzer::class)->analyze();

        self::assertSame('rules', $analysis->engine);
        self::assertSame('No model configured.', $analysis->fallbackReason);
        self::assertSame([], $this->completion()->requests);
        self::assertSame(['analysis.produced'], $this->journalTypes());
    }

    public function testHandsTheModelOnlyNonRoutineEvidence(): void
    {
        $journal = self::service(Journal::class);
        $journal->record(EventType::OrderCreated, 'routine', 'nova');
        $throttle = $journal->record(EventType::RateLimited, 'quota', 'nova');

        $context = self::service(IncidentAnalyzer::class)->context();

        self::assertSame([$throttle], array_column($context->events, 'id'));
        self::assertSame(['channel.rate_limited' => 1, 'order.created' => 1], $context->eventCounts);
    }

    public function testFiltersInventedEvidenceFromTheModel(): void
    {
        $throttle = self::service(Journal::class)->record(EventType::RateLimited, 'quota', 'nova');
        $this->completion()->configured = true;
        $this->completion()->answer = [
            'level' => 'degraded',
            'summary' => 'Nova is throttled.',
            'findings' => [
                ['title' => 'Quota', 'explanation' => 'Real.', 'evidence' => [$throttle]],
                ['title' => 'Ghost', 'explanation' => 'Invented.', 'evidence' => ['987654']],
            ],
            'recommendations' => [['action' => 'pause_channel', 'channel' => 'mars', 'rationale' => 'No such channel.']],
        ];

        $analysis = self::service(IncidentAnalyzer::class)->analyze();

        self::assertSame('claude:fake', $analysis->engine);
        self::assertSame(['Quota'], array_map(static fn ($f): string => $f->title, $analysis->findings));
        self::assertSame([], $analysis->recommendations);
        self::assertSame(2, $analysis->discarded);
    }

    public function testFallsBackToRulesWhenTheModelFails(): void
    {
        $this->completion()->configured = true;
        $this->completion()->answer = new AnalystUnavailable('The model could not be reached: timeout');

        $analysis = self::service(IncidentAnalyzer::class)->analyze();

        self::assertSame('rules', $analysis->engine);
        self::assertSame('The model could not be reached: timeout', $analysis->fallbackReason);
    }
}
