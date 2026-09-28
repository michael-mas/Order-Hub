<?php

declare(strict_types=1);

namespace App\Controller;

use App\Application\ChannelOperations;
use App\Application\ChannelStates;
use App\Application\JournalReader;
use App\Domain\Channel\ChannelRegistry;
use App\Domain\Channel\UnknownChannel;
use Psr\Clock\ClockInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

final class ChannelController extends AbstractController
{
    public function __construct(
        private readonly ChannelRegistry $channels,
        private readonly ChannelStates $states,
        private readonly JournalReader $readModel,
        private readonly ClockInterface $clock,
    ) {
    }

    #[Route('/api/channels', name: 'channels', methods: ['GET'], priority: 10)]
    public function list(): JsonResponse
    {
        $now = $this->clock->now();
        $stats = $this->readModel->orderStatsByChannel($now);
        $channels = [];
        foreach ($this->channels->all() as $channel) {
            $state = $this->states->get($channel->code);
            $channels[] = [
                'code' => $channel->code,
                'name' => $channel->name,
                'supports_webhooks' => $channel->supportsWebhooks,
                'poll_interval_seconds' => $channel->pollIntervalSeconds,
                'paused' => $state->isPaused(),
                'throttled_until' => $state->isThrottled($now) ? $state->getThrottledUntil()?->format(\DATE_ATOM) : null,
                'cursor' => $state->getCursor()?->format(\DATE_ATOM),
                'reconciliation_in_progress' => null !== $state->getReconcileFrom(),
                'last_poll_at' => $state->getLastPollAt()?->format(\DATE_ATOM),
                'last_poll_outcome' => $state->getLastPollOutcome(),
                'orders' => $stats[$channel->code]['orders'] ?? 0,
                'acknowledged' => $stats[$channel->code]['acknowledged'] ?? 0,
                'updated_last_5_min' => $stats[$channel->code]['updated_last_5_min'] ?? 0,
            ];
        }

        return new JsonResponse(['channels' => $channels]);
    }

    #[Route('/api/channels/{code}/{action}', name: 'channel_action', requirements: ['action' => 'pause|resume|reconcile'], methods: ['POST'], priority: 10)]
    public function act(string $code, string $action, ChannelOperations $operations): JsonResponse
    {
        try {
            match ($action) {
                'pause' => $operations->pause($code),
                'resume' => $operations->resume($code),
                'reconcile' => $operations->reconcile($code),
                default => throw new \LogicException('Unreachable'),
            };
        } catch (UnknownChannel $e) {
            throw new NotFoundHttpException($e->getMessage(), $e);
        }

        return new JsonResponse(['status' => 'done', 'action' => $action, 'channel' => $code], Response::HTTP_ACCEPTED);
    }
}
