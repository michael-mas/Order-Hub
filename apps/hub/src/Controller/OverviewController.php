<?php

declare(strict_types=1);

namespace App\Controller;

use App\Application\FailedMessages;
use App\Application\JournalReader;
use Psr\Clock\ClockInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class OverviewController extends AbstractController
{
    /** What happened in the last few minutes, for the console header. */
    #[Route('/api/overview', name: 'overview', methods: ['GET'], priority: 10)]
    public function __invoke(JournalReader $readModel, FailedMessages $failed, ClockInterface $clock): JsonResponse
    {
        $now = $clock->now();
        $byChannel = $readModel->orderStatsByChannel($now);

        return new JsonResponse([
            'generated_at' => $now->format(\DATE_ATOM),
            'orders' => array_sum(array_column($byChannel, 'orders')),
            'acknowledged' => array_sum(array_column($byChannel, 'acknowledged')),
            'failed_messages' => $failed->count(),
            'events_last_15_min' => $readModel->eventCounts($now->modify('-15 minutes')),
        ]);
    }
}
