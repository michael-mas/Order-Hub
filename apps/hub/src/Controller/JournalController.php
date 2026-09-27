<?php

declare(strict_types=1);

namespace App\Controller;

use App\Domain\Journal\Severity;
use App\Infrastructure\Persistence\ReadModel;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryString;
use Symfony\Component\Routing\Attribute\Route;

final class JournalController extends AbstractController
{
    /**
     * Without `after`: the latest entries. With `after`: every newer entry,
     * which is how the console tails the journal.
     */
    #[Route('/api/journal', name: 'journal', methods: ['GET'], priority: 10)]
    public function __invoke(ReadModel $readModel, #[MapQueryString(validationFailedStatusCode: 422)] JournalQuery $query = new JournalQuery()): JsonResponse
    {
        $entries = $readModel->journal(
            $query->after,
            $query->limit,
            Severity::from($query->min_severity),
            $query->channel,
        );

        return new JsonResponse([
            // An empty context must stay a JSON object, not become [].
            'entries' => array_map(static fn (array $e): array => ['context' => (object) $e['context']] + $e, $entries),
            'last_id' => [] === $entries ? $query->after : $entries[array_key_last($entries)]['id'],
        ]);
    }
}
