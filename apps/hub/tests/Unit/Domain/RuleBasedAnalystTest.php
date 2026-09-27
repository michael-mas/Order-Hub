<?php

declare(strict_types=1);

namespace App\Tests\Unit\Domain;

use App\Domain\Incident\AnalysisSanitizer;
use App\Domain\Incident\IncidentLevel;
use App\Domain\Incident\Recommendation;
use App\Domain\Incident\RuleBasedAnalyst;
use PHPUnit\Framework\TestCase;

final class RuleBasedAnalystTest extends TestCase
{
    public function testAQuietJournalIsOk(): void
    {
        $analysis = new RuleBasedAnalyst()->analyze(IncidentFixtures::context());

        self::assertSame(IncidentLevel::Ok, $analysis->level);
        self::assertSame([], $analysis->findings);
        self::assertSame('none', $analysis->recommendations[0]->action->value);
    }

    public function testAbsorbedDuplicatesAreReassuringNotAlarming(): void
    {
        $analysis = new RuleBasedAnalyst()->analyze(IncidentFixtures::context([
            ['webhook.duplicate', 'nova', 'info'],
            ['order.stale_ignored', 'nova'],
        ]));

        self::assertSame(IncidentLevel::Ok, $analysis->level);
        self::assertStringContainsString('absorbed', $analysis->findings[0]->title);
    }

    public function testRepeatedThrottlingSuggestsAReconciliation(): void
    {
        $analysis = new RuleBasedAnalyst()->analyze(IncidentFixtures::context(array_fill(0, 3, ['channel.rate_limited', 'atlas'])));

        self::assertSame(IncidentLevel::Degraded, $analysis->level);
        self::assertSame([['reconcile_channel', 'atlas']], self::actions($analysis->recommendations));
    }

    public function testALongOutageSuggestsPausingTheChannel(): void
    {
        $analysis = new RuleBasedAnalyst()->analyze(IncidentFixtures::context(array_fill(0, 10, ['poll.failed', 'nova', 'error'])));

        self::assertSame(IncidentLevel::Incident, $analysis->level);
        self::assertContains(['pause_channel', 'nova'], self::actions($analysis->recommendations));
    }

    public function testFailedMessagesAreAnIncidentWithAReplay(): void
    {
        $analysis = new RuleBasedAnalyst()->analyze(IncidentFixtures::context([['message.failed', 'atlas', 'error']], failed: 3));

        self::assertContains(['replay_failed_messages', null], self::actions($analysis->recommendations));
        self::assertSame(['100'], $analysis->findings[0]->evidence);
    }

    public function testAHealthyPausedChannelShouldBeResumed(): void
    {
        $analysis = new RuleBasedAnalyst()->analyze(IncidentFixtures::context([['channel.paused', 'atlas']], paused: ['atlas' => true]));

        self::assertContains(['resume_channel', 'atlas'], self::actions($analysis->recommendations));
    }

    public function testEveryRuleOutputSurvivesTheSanitizer(): void
    {
        $context = IncidentFixtures::context([
            ['message.failed', 'atlas', 'error'],
            ['order.invalid_payload', 'nova', 'error'],
            ['webhook.rejected', 'nova', 'error'],
            ...array_fill(0, 12, ['poll.failed', 'atlas', 'error']),
            ...array_fill(0, 4, ['channel.rate_limited', 'nova']),
            ['webhook.duplicate', 'nova', 'info'],
        ], failed: 2);
        $analysis = new RuleBasedAnalyst()->analyze($context);

        $clean = AnalysisSanitizer::sanitize($analysis, $context);

        self::assertSame(0, $clean->discarded);
        self::assertCount(\count($analysis->findings), $clean->findings);
    }

    /**
     * @param list<Recommendation> $recommendations
     *
     * @return list<array{string, ?string}>
     */
    private static function actions(array $recommendations): array
    {
        return array_map(static fn (Recommendation $r): array => [$r->action->value, $r->channel], $recommendations);
    }
}
