<?php

declare(strict_types=1);

namespace App\Application;

use App\Domain\Incident\Analysis;
use App\Domain\Incident\Finding;

/**
 * An analysis and the journal entries it cites, so an operator can read the
 * evidence even when it has already scrolled out of the live journal.
 */
final readonly class IncidentReport
{
    /**
     * @param list<array{id: string, occurred_at: string, channel: ?string, type: string, severity: string, message: string}> $evidence oldest first
     */
    public function __construct(
        public Analysis $analysis,
        public array $evidence,
    ) {
    }

    /**
     * @param list<array{id: string, occurred_at: string, channel: ?string, type: string, severity: string, message: string, context: array<string, mixed>}> $events
     */
    public static function of(Analysis $analysis, array $events): self
    {
        $cited = [];
        foreach ($analysis->findings as $finding) {
            \assert($finding instanceof Finding);
            foreach ($finding->evidence as $id) {
                $cited[$id] = true;
            }
        }
        $evidence = [];
        foreach ($events as $event) {
            if (isset($cited[$event['id']])) {
                unset($event['context']);
                $evidence[] = $event;
            }
        }

        return new self($analysis, $evidence);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return $this->analysis->toArray() + ['evidence' => $this->evidence];
    }
}
