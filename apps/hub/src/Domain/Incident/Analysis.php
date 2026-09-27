<?php

declare(strict_types=1);

namespace App\Domain\Incident;

final readonly class Analysis
{
    /**
     * @param list<Finding>        $findings
     * @param list<Recommendation> $recommendations
     */
    public function __construct(
        /** Which engine produced it: "claude:<model>" or "rules". */
        public string $engine,
        public IncidentLevel $level,
        public string $summary,
        public array $findings,
        public array $recommendations,
        /** Findings and recommendations removed because they could not be verified. */
        public int $discarded = 0,
        /** Why the rule engine answered instead of the model, if it did. */
        public ?string $fallbackReason = null,
    ) {
    }

    public function withEngine(string $engine, ?string $fallbackReason): self
    {
        return new self($engine, $this->level, $this->summary, $this->findings, $this->recommendations, $this->discarded, $fallbackReason);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'engine' => $this->engine,
            'fallback_reason' => $this->fallbackReason,
            'level' => $this->level->value,
            'summary' => $this->summary,
            'findings' => array_map(static fn (Finding $f): array => [
                'title' => $f->title,
                'explanation' => $f->explanation,
                'evidence' => $f->evidence,
            ], $this->findings),
            'recommendations' => array_map(static fn (Recommendation $r): array => [
                'action' => $r->action->value,
                'channel' => $r->channel,
                'rationale' => $r->rationale,
            ], $this->recommendations),
            'discarded' => $this->discarded,
        ];
    }
}
