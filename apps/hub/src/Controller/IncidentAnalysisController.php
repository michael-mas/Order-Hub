<?php

declare(strict_types=1);

namespace App\Controller;

use App\Application\ChannelOperations;
use App\Application\FailedMessages;
use App\Application\IncidentAnalyzer;
use App\Domain\Channel\UnknownChannel;
use App\Domain\Incident\RecommendedAction;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\Routing\Attribute\Route;

final class IncidentAnalysisController extends AbstractController
{
    #[Route('/api/incident-analyses', name: 'incident_analysis', methods: ['POST'], priority: 10)]
    public function analyze(IncidentAnalyzer $analyzer): JsonResponse
    {
        return new JsonResponse($analyzer->analyze()->toArray(), Response::HTTP_CREATED);
    }

    /**
     * Runs a recommended action. Only ever called by a human pressing the
     * button next to the recommendation.
     */
    #[Route('/api/incident-analyses/actions', name: 'incident_action', methods: ['POST'], priority: 10)]
    public function act(#[MapRequestPayload] ActionRequest $request, ChannelOperations $operations, FailedMessages $failed): JsonResponse
    {
        $action = RecommendedAction::from($request->action);
        if ($action->needsChannel() && null === $request->channel) {
            throw new UnprocessableEntityHttpException('This action needs a channel.');
        }

        try {
            $channel = (string) $request->channel;
            $result = [];
            match ($action) {
                RecommendedAction::ReplayFailedMessages => $result['replayed'] = $failed->replayAll(),
                RecommendedAction::PauseChannel => $operations->pause($channel),
                RecommendedAction::ResumeChannel => $operations->resume($channel),
                RecommendedAction::ReconcileChannel => $operations->reconcile($channel),
                RecommendedAction::None => null,
            };
        } catch (UnknownChannel $e) {
            throw new UnprocessableEntityHttpException($e->getMessage(), $e);
        }

        return new JsonResponse(['status' => 'done', 'action' => $action->value, 'channel' => $request->channel] + $result, Response::HTTP_ACCEPTED);
    }
}
