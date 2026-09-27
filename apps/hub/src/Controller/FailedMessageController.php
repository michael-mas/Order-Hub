<?php

declare(strict_types=1);

namespace App\Controller;

use App\Application\FailedMessage;
use App\Application\FailedMessages;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

final class FailedMessageController extends AbstractController
{
    public function __construct(private readonly FailedMessages $failed)
    {
    }

    #[Route('/api/failed-messages', name: 'failed_messages', methods: ['GET'], priority: 10)]
    public function list(): JsonResponse
    {
        return new JsonResponse([
            'count' => $this->failed->count(),
            'messages' => array_map(static fn (FailedMessage $m): array => [
                'id' => $m->id,
                'type' => $m->type,
                'channel' => $m->channel,
                'order_id' => $m->orderId,
                'error' => $m->error,
                'attempts' => $m->attempts,
                'failed_at' => $m->failedAt?->format(\DATE_ATOM),
            ], $this->failed->list()),
        ]);
    }

    #[Route('/api/failed-messages/replay', name: 'failed_messages_replay_all', methods: ['POST'], priority: 20)]
    public function replayAll(): JsonResponse
    {
        return new JsonResponse(['replayed' => $this->failed->replayAll()]);
    }

    #[Route('/api/failed-messages/{id}/replay', name: 'failed_message_replay', requirements: ['id' => '\d+'], methods: ['POST'], priority: 10)]
    public function replay(string $id): JsonResponse
    {
        if (!$this->failed->replay($id)) {
            throw new NotFoundHttpException('No such failed message.');
        }

        return new JsonResponse(['replayed' => 1]);
    }
}
