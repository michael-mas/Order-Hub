<?php

declare(strict_types=1);

namespace App\Infrastructure\Ai;

use Anthropic\Beta\Messages\BetaTextBlock;
use Anthropic\Client;
use Anthropic\Core\Exceptions\APIException;
use App\Domain\Incident\AnalystUnavailable;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class AnthropicStructuredCompletion implements StructuredCompletion
{
    private ?Client $client = null;

    public function __construct(
        #[Autowire('%env(ANTHROPIC_API_KEY)%')]
        private readonly string $apiKey,
        #[Autowire('%env(ANTHROPIC_MODEL)%')]
        private readonly string $model,
    ) {
    }

    public function isConfigured(): bool
    {
        return '' !== trim($this->apiKey);
    }

    public function engine(): string
    {
        return 'claude:'.$this->model;
    }

    public function complete(string $system, string $user, array $schema): array
    {
        if (!$this->isConfigured()) {
            throw new AnalystUnavailable('No API key configured.');
        }
        $this->client ??= new Client(apiKey: $this->apiKey, requestOptions: ['timeout' => 60, 'maxRetries' => 1]);

        try {
            $message = $this->client->beta->messages->create(
                maxTokens: 16000,
                messages: [['role' => 'user', 'content' => $user]],
                model: $this->model,
                system: $system,
                thinking: ['type' => 'adaptive'],
                outputConfig: ['format' => ['type' => 'json_schema', 'schema' => $schema]],
                // A request declined by a safety classifier is re-run on the
                // fallback model the API picks, inside the same call.
                fallbacks: 'default',
                betas: ['server-side-fallback-2026-07-01'],
            );
        } catch (APIException $e) {
            throw new AnalystUnavailable('The model could not be reached: '.$e->getMessage(), previous: $e);
        }

        if ('refusal' === $message->stopReason) {
            throw new AnalystUnavailable('The model declined the request.');
        }
        if ('max_tokens' === $message->stopReason) {
            throw new AnalystUnavailable('The answer was cut short.');
        }
        foreach ($message->content as $block) {
            if ($block instanceof BetaTextBlock) {
                $data = json_decode($block->text, true);
                if (!\is_array($data)) {
                    throw new AnalystUnavailable('The answer is not valid JSON.');
                }

                return $data;
            }
        }

        throw new AnalystUnavailable('The answer contains no text.');
    }
}
