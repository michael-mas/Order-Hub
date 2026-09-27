<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Domain\Incident\AnalystUnavailable;
use App\Infrastructure\Ai\StructuredCompletion;

final class FakeCompletion implements StructuredCompletion
{
    public bool $configured = false;
    /** @var array<mixed>|AnalystUnavailable|null */
    public array|AnalystUnavailable|null $answer = null;
    /** @var list<array{system: string, user: string, schema: array<string, mixed>}> */
    public array $requests = [];

    public function complete(string $system, string $user, array $schema): array
    {
        $this->requests[] = ['system' => $system, 'user' => $user, 'schema' => $schema];
        if ($this->answer instanceof AnalystUnavailable) {
            throw $this->answer;
        }

        return $this->answer ?? throw new AnalystUnavailable('No scripted answer.');
    }

    public function isConfigured(): bool
    {
        return $this->configured;
    }

    public function engine(): string
    {
        return 'claude:fake';
    }
}
