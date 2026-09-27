<?php

declare(strict_types=1);

namespace App\Controller;

use App\Application\WebhookReceiver;
use App\Application\WebhookResult;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class WebhookController extends AbstractController
{
    #[Route('/webhooks/{channel}', name: 'webhook_receive', requirements: ['channel' => '[a-z][a-z0-9-]{1,31}'], methods: ['POST'])]
    public function __invoke(string $channel, Request $request, WebhookReceiver $receiver): JsonResponse
    {
        $result = $receiver->receive(
            $channel,
            $request->getContent(),
            (string) $request->headers->get('x-marketplace-signature', ''),
            (string) $request->headers->get('x-marketplace-event-id', ''),
        );

        return new JsonResponse(['status' => $result->value], match ($result) {
            WebhookResult::Accepted => Response::HTTP_ACCEPTED,
            WebhookResult::Duplicate => Response::HTTP_OK,
            WebhookResult::Unauthorized => Response::HTTP_UNAUTHORIZED,
            WebhookResult::Invalid => Response::HTTP_UNPROCESSABLE_ENTITY,
            WebhookResult::UnknownChannel => Response::HTTP_NOT_FOUND,
        });
    }
}
