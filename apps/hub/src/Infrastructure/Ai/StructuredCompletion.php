<?php

declare(strict_types=1);

namespace App\Infrastructure\Ai;

use App\Domain\Incident\AnalystUnavailable;

/**
 * One request, one JSON answer constrained by a schema. The seam that keeps
 * every test away from the network.
 */
interface StructuredCompletion
{
    /**
     * @param array<string, mixed> $schema
     *
     * @return array<mixed> the decoded answer
     *
     * @throws AnalystUnavailable
     */
    public function complete(string $system, string $user, array $schema): array;

    public function isConfigured(): bool;

    /** Identifies the model in the analysis, e.g. "claude:claude-opus-5". */
    public function engine(): string;
}
