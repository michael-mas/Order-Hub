<?php

declare(strict_types=1);

namespace App\Infrastructure\Ai;

use App\Application\ModelAnalyst;
use App\Domain\Incident\Analysis;
use App\Domain\Incident\AnalysisFactory;
use App\Domain\Incident\IncidentContext;
use App\Domain\Incident\IncidentLevel;
use App\Domain\Incident\RecommendedAction;

/**
 * Asks Claude for a diagnosis of the journal. The model only reads and
 * recommends: its answer goes through the same sanitizer as the rule engine,
 * and every action stays a button a human presses (ADR 0004).
 */
final readonly class ClaudeAnalyst implements ModelAnalyst
{
    public const string SYSTEM_PROMPT = <<<'PROMPT'
        You are the incident analyst of Order Hub, a service that imports orders from marketplaces
        through webhooks and polling, deduplicates them, keeps the highest version of each order and
        acknowledges them back to the marketplace. An operator reads your analysis in a console.

        You receive the recent journal (each entry has an id), the state of each channel and the size
        of the failure queue. Explain what is happening and what the operator should do.

        Rules:
        - Every finding must cite, in "evidence", the ids of the journal entries it is based on.
          Cite only ids present in the input. A finding you cannot support with entries is not a finding.
        - Recommend only actions from the schema. "channel" is required for channel actions and must
          be one of the listed channel codes; use an empty string otherwise.
        - Duplicate webhooks, duplicate or stale versions ignored, and retries followed by success are
          the system working as designed. Say so rather than raising an alarm.
        - Prefer "none" to a recommendation you are unsure of. Nothing is executed without the operator.
        - Be concise and concrete: short titles, explanations of two or three sentences, plain English.
        PROMPT;

    public function __construct(private StructuredCompletion $completion)
    {
    }

    public function analyze(IncidentContext $context): Analysis
    {
        $data = $this->completion->complete(self::SYSTEM_PROMPT, $this->userMessage($context), self::schema());

        return AnalysisFactory::fromArray($data, $this->completion->engine());
    }

    public function isConfigured(): bool
    {
        return $this->completion->isConfigured();
    }

    /**
     * @return array<string, mixed>
     */
    public static function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['level', 'summary', 'findings', 'recommendations'],
            'properties' => [
                'level' => ['type' => 'string', 'enum' => array_column(IncidentLevel::cases(), 'value')],
                'summary' => ['type' => 'string'],
                'findings' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['title', 'explanation', 'evidence'],
                        'properties' => [
                            'title' => ['type' => 'string'],
                            'explanation' => ['type' => 'string'],
                            'evidence' => ['type' => 'array', 'items' => ['type' => 'string']],
                        ],
                    ],
                ],
                'recommendations' => [
                    'type' => 'array',
                    'items' => [
                        'type' => 'object',
                        'additionalProperties' => false,
                        'required' => ['action', 'channel', 'rationale'],
                        'properties' => [
                            'action' => ['type' => 'string', 'enum' => array_column(RecommendedAction::cases(), 'value')],
                            'channel' => ['type' => 'string'],
                            'rationale' => ['type' => 'string'],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function userMessage(IncidentContext $context): string
    {
        $input = [
            'generated_at' => $context->generatedAt->format(\DATE_ATOM),
            'window_minutes' => $context->windowMinutes,
            'failure_queue_size' => $context->failedMessages,
            'event_counts' => $context->eventCounts,
            'channels' => $context->channels,
            'journal' => array_map(static fn (array $e): array => [
                'id' => $e['id'],
                'at' => $e['occurred_at'],
                'channel' => $e['channel'],
                'type' => $e['type'],
                'severity' => $e['severity'],
                'message' => $e['message'],
                'context' => $e['context'],
            ], $context->events),
        ];

        return "Analyse this state of the hub.\n\n".json_encode($input, \JSON_PRETTY_PRINT | \JSON_UNESCAPED_SLASHES | \JSON_THROW_ON_ERROR);
    }
}
