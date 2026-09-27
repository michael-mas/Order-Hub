<?php

declare(strict_types=1);

namespace App\Tests\Unit\Domain;

use App\Domain\Incident\Analysis;
use App\Domain\Incident\AnalysisSanitizer;
use App\Domain\Incident\Finding;
use App\Domain\Incident\IncidentLevel;
use App\Domain\Incident\Recommendation;
use App\Domain\Incident\RecommendedAction;
use PHPUnit\Framework\TestCase;

final class AnalysisSanitizerTest extends TestCase
{
    public function testKeepsOnlyEvidenceThatExistsInTheContext(): void
    {
        $context = IncidentFixtures::context([['channel.rate_limited', 'nova'], ['channel.rate_limited', 'nova']]);
        $analysis = new Analysis('claude:test', IncidentLevel::Degraded, 'Quota.', [
            new Finding('Real', 'Cites real and invented ids.', ['100', '999', '101', '100']),
            new Finding('Invented', 'Cites nothing that exists.', ['424242']),
        ], []);

        $clean = AnalysisSanitizer::sanitize($analysis, $context);

        self::assertCount(1, $clean->findings);
        self::assertSame(['100', '101'], $clean->findings[0]->evidence);
        self::assertSame(1, $clean->discarded);
    }

    public function testDropsRecommendationsThatCannotApply(): void
    {
        $context = IncidentFixtures::context(failed: 0);
        $analysis = new Analysis('claude:test', IncidentLevel::Degraded, 'x', [], [
            new Recommendation(RecommendedAction::PauseChannel, 'nova', 'ok'),
            new Recommendation(RecommendedAction::PauseChannel, 'nova', 'duplicate'),
            new Recommendation(RecommendedAction::PauseChannel, 'unknown-channel', 'no such channel'),
            new Recommendation(RecommendedAction::ReconcileChannel, null, 'channel missing'),
            new Recommendation(RecommendedAction::ReplayFailedMessages, null, 'nothing to replay'),
            new Recommendation(RecommendedAction::None, 'nova', 'channel ignored'),
        ]);

        $clean = AnalysisSanitizer::sanitize($analysis, $context);

        self::assertSame(
            [['pause_channel', 'nova'], ['none', null]],
            array_map(static fn (Recommendation $r): array => [$r->action->value, $r->channel], $clean->recommendations),
        );
        self::assertSame(4, $clean->discarded);
    }

    public function testClipsOverlongText(): void
    {
        $context = IncidentFixtures::context([['poll.failed', 'nova']]);
        $analysis = new Analysis('x', IncidentLevel::Ok, str_repeat('s', 2000), [new Finding(str_repeat('t', 500), 'e', ['100'])], []);

        $clean = AnalysisSanitizer::sanitize($analysis, $context);

        self::assertSame(600, mb_strlen($clean->summary));
        self::assertSame(120, mb_strlen($clean->findings[0]->title));
    }
}
