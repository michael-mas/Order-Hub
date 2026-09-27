<?php

declare(strict_types=1);

namespace App\Domain\Incident;

/**
 * Turns an untrusted structured answer into an {@see Analysis}, or refuses it.
 */
final class AnalysisFactory
{
    /**
     * @param array<mixed> $data
     *
     * @throws AnalystUnavailable when the shape is wrong
     */
    public static function fromArray(array $data, string $engine): Analysis
    {
        $level = IncidentLevel::tryFrom(\is_string($data['level'] ?? null) ? $data['level'] : '');
        $summary = $data['summary'] ?? null;
        if (null === $level || !\is_string($summary) || !\is_array($data['findings'] ?? null) || !\is_array($data['recommendations'] ?? null)) {
            throw new AnalystUnavailable('The analysis does not match the expected shape.');
        }

        $findings = [];
        foreach ($data['findings'] as $finding) {
            if (!\is_array($finding) || !\is_string($finding['title'] ?? null) || !\is_string($finding['explanation'] ?? null) || !\is_array($finding['evidence'] ?? null)) {
                throw new AnalystUnavailable('A finding does not match the expected shape.');
            }
            $findings[] = new Finding(
                $finding['title'],
                $finding['explanation'],
                array_values(array_map(strval(...), array_filter($finding['evidence'], static fn (mixed $id): bool => \is_string($id) || \is_int($id)))),
            );
        }

        $recommendations = [];
        foreach ($data['recommendations'] as $recommendation) {
            $action = \is_array($recommendation) && \is_string($recommendation['action'] ?? null)
                ? RecommendedAction::tryFrom($recommendation['action'])
                : null;
            if (null === $action || !\is_array($recommendation) || !\is_string($recommendation['rationale'] ?? null)) {
                throw new AnalystUnavailable('A recommendation does not match the expected shape.');
            }
            $channel = $recommendation['channel'] ?? null;
            $recommendations[] = new Recommendation(
                $action,
                \is_string($channel) && '' !== $channel ? $channel : null,
                $recommendation['rationale'],
            );
        }

        return new Analysis($engine, $level, $summary, $findings, $recommendations);
    }
}
