<?php

declare(strict_types=1);

namespace App\Tests\Unit\Domain;

use App\Domain\Incident\AnalysisFactory;
use App\Domain\Incident\AnalystUnavailable;
use PHPUnit\Framework\TestCase;

final class AnalysisFactoryTest extends TestCase
{
    public function testBuildsAnAnalysisFromAWellFormedAnswer(): void
    {
        $analysis = AnalysisFactory::fromArray([
            'level' => 'degraded',
            'summary' => 'Quota pressure on atlas.',
            'findings' => [['title' => 'Quota', 'explanation' => 'Throttled.', 'evidence' => ['12', 13]]],
            'recommendations' => [['action' => 'reconcile_channel', 'channel' => 'atlas', 'rationale' => 'Catch up.'], ['action' => 'none', 'channel' => '', 'rationale' => '-']],
        ], 'claude:test');

        self::assertSame('claude:test', $analysis->engine);
        self::assertSame(['12', '13'], $analysis->findings[0]->evidence);
        self::assertSame('atlas', $analysis->recommendations[0]->channel);
        self::assertNull($analysis->recommendations[1]->channel);
    }

    /**
     * @dataProvider malformedAnswers
     *
     * @param array<mixed> $answer
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('malformedAnswers')]
    public function testRefusesMalformedAnswers(array $answer): void
    {
        $this->expectException(AnalystUnavailable::class);
        AnalysisFactory::fromArray($answer, 'claude:test');
    }

    /**
     * @return iterable<string, array{array<mixed>}>
     */
    public static function malformedAnswers(): iterable
    {
        $valid = ['level' => 'ok', 'summary' => 's', 'findings' => [], 'recommendations' => []];
        yield 'unknown level' => [['level' => 'panic'] + $valid];
        yield 'missing summary' => [array_diff_key($valid, ['summary' => true])];
        yield 'finding without evidence' => [['findings' => [['title' => 't', 'explanation' => 'e']]] + $valid];
        yield 'invented action' => [['recommendations' => [['action' => 'drop_database', 'channel' => '', 'rationale' => 'r']]] + $valid];
    }
}
