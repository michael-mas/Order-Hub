<?php

declare(strict_types=1);

namespace App\Infrastructure\Http;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * The operations API (`/api/…`) answers only callers holding the service
 * token: the console, server side. Webhooks carry their own HMAC signature;
 * `/health` and the OpenAPI description stay public. Without a configured
 * token nothing gets through: the check fails closed.
 *
 * One shared secret between two server processes, no users, no roles, no
 * session: a constant-time comparison says all there is to say (ADR 0008).
 */
#[AsEventListener(event: KernelEvents::REQUEST, priority: 256)]
final readonly class ServiceTokenListener
{
    private const string PUBLIC_API = '#^/api/(docs|contexts)([./]|$)#';

    public function __construct(
        #[Autowire('%env(HUB_API_TOKEN)%')]
        private string $token,
    ) {
    }

    public function __invoke(RequestEvent $event): void
    {
        if (!$event->isMainRequest() || !self::isProtected($event->getRequest()->getPathInfo())) {
            return;
        }

        $header = (string) $event->getRequest()->headers->get('Authorization', '');
        $given = str_starts_with($header, 'Bearer ') ? substr($header, 7) : '';
        if ('' !== $this->token && hash_equals($this->token, $given)) {
            return;
        }

        $event->setResponse(new JsonResponse(
            ['error' => 'This API requires the service token.'],
            401,
            ['WWW-Authenticate' => 'Bearer'],
        ));
    }

    public static function isProtected(string $path): bool
    {
        if ('/api' !== $path && !str_starts_with($path, '/api/')) {
            return false;
        }

        return 1 !== preg_match(self::PUBLIC_API, $path);
    }
}
