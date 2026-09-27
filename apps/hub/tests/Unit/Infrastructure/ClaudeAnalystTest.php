<?php

declare(strict_types=1);

namespace App\Tests\Unit\Infrastructure;

use App\Domain\Incident\AnalystUnavailable;
use App\Domain\Incident\IncidentLevel;
use App\Domain\Incident\RecommendedAction;
use App\Infrastructure\Ai\AnthropicStructuredCompletion;
use App\Infrastructure\Ai\ClaudeAnalyst;
use App\Tests\Support\FakeCompletion;
use App\Tests\Unit\Domain\IncidentFixtures;
use PHPUnit\Framework\TestCase;

final class ClaudeAnalystTest extends TestCase
{
    public function testSendsTheJournalWithItsIdsAndParsesTheAnswer(): void
    {
        $completion = new FakeCompletion();
        $completion->configured = true;
        $completion->answer = [
            'level' => 'degraded',
            'summary' => 'Atlas is throttled.',
            'findings' => [['title' => 'Quota', 'explanation' => 'Repeated 429.', 'evidence' => ['100']]],
            'recommendations' => [['action' => 'reconcile_channel', 'channel' => 'atlas', 'rationale' => 'Catch up.']],
        ];

        $analysis = new ClaudeAnalyst($completion)->analyze(IncidentFixtures::context([['channel.rate_limited', 'atlas']], failed: 2));

        self::assertSame('claude:fake', $analysis->engine);
        self::assertSame(IncidentLevel::Degraded, $analysis->level);
        $request = $completion->requests[0];
        self::assertSame(ClaudeAnalyst::SYSTEM_PROMPT, $request['system']);
        self::assertStringContainsString('"id": "100"', $request['user']);
        self::assertStringContainsString('"failure_queue_size": 2', $request['user']);
    }

    public function testTheSchemaOffersExactlyTheDomainChoices(): void
    {
        $schema = json_encode(ClaudeAnalyst::schema(), \JSON_THROW_ON_ERROR);

        self::assertStringContainsString('"enum":'.json_encode(array_column(IncidentLevel::cases(), 'value'), \JSON_THROW_ON_ERROR), $schema);
        self::assertStringContainsString('"enum":'.json_encode(array_column(RecommendedAction::cases(), 'value'), \JSON_THROW_ON_ERROR), $schema);
        self::assertSame(3, substr_count($schema, '"additionalProperties":false'), 'The root, finding and recommendation objects are all closed.');
    }

    public function testPropagatesUnavailability(): void
    {
        $completion = new FakeCompletion();
        $completion->answer = new AnalystUnavailable('down');

        $this->expectException(AnalystUnavailable::class);
        new ClaudeAnalyst($completion)->analyze(IncidentFixtures::context());
    }

    public function testTheRealAdapterNeverCallsOutWithoutAKey(): void
    {
        $adapter = new AnthropicStructuredCompletion('', 'claude-opus-5');

        self::assertFalse($adapter->isConfigured());
        self::assertSame('claude:claude-opus-5', $adapter->engine());
        $this->expectException(AnalystUnavailable::class);
        $adapter->complete('s', 'u', []);
    }
}
