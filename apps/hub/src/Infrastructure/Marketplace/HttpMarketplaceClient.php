<?php

declare(strict_types=1);

namespace App\Infrastructure\Marketplace;

use App\Application\AcknowledgementResult;
use App\Application\MarketplaceClient;
use App\Application\MarketplaceThrottled;
use App\Application\MarketplaceUnavailable;
use App\Application\OrdersPage;
use App\Domain\Channel\Channel;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

final readonly class HttpMarketplaceClient implements MarketplaceClient
{
    /** Retry-After beyond this is treated as this: a stuck channel is an incident, not a plan. */
    private const int MAX_RETRY_AFTER = 3600;

    public function __construct(
        #[Target('marketplace.client')]
        private HttpClientInterface $http,
    ) {
    }

    public function listOrders(Channel $channel, \DateTimeImmutable $updatedSince, ?string $pageToken, int $limit): OrdersPage
    {
        $query = [
            'updated_since' => $updatedSince->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z'),
            'limit' => $limit,
        ];
        if (null !== $pageToken) {
            $query['page_token'] = $pageToken;
        }
        $body = $this->send($channel, 'GET', \sprintf('/v1/%s/orders', $channel->code), ['query' => $query], [200]);

        $orders = $body['orders'] ?? null;
        $next = $body['next_page_token'] ?? null;
        if (!\is_array($orders) || !array_is_list($orders) || (null !== $next && !\is_string($next))) {
            throw new MarketplaceUnavailable('Unexpected order list shape.');
        }

        return new OrdersPage(
            array_values(array_filter($orders, \is_array(...))),
            $next,
        );
    }

    public function acknowledge(Channel $channel, string $externalId, string $merchantReference): AcknowledgementResult
    {
        $path = \sprintf('/v1/%s/orders/%s/acknowledgements', $channel->code, rawurlencode($externalId));
        $response = $this->request($channel, 'POST', $path, ['json' => ['merchant_order_ref' => $merchantReference]]);

        return match ($this->status($response)) {
            201 => AcknowledgementResult::Acknowledged,
            200 => AcknowledgementResult::AlreadyAcknowledged,
            409 => AcknowledgementResult::Conflict,
            404 => AcknowledgementResult::UnknownOrder,
            default => throw new MarketplaceUnavailable(\sprintf('Unexpected status %d on acknowledgement.', $this->status($response))),
        };
    }

    /**
     * @param array<string, mixed> $options
     * @param list<int>            $expected
     *
     * @return array<mixed>
     */
    private function send(Channel $channel, string $method, string $path, array $options, array $expected): array
    {
        $response = $this->request($channel, $method, $path, $options);
        $status = $this->status($response);
        if (!\in_array($status, $expected, true)) {
            throw new MarketplaceUnavailable(\sprintf('Unexpected status %d on %s %s.', $status, $method, $path));
        }
        try {
            return $response->toArray(false);
        } catch (ExceptionInterface $e) {
            throw new MarketplaceUnavailable('Unreadable response: '.$e->getMessage(), previous: $e);
        }
    }

    /**
     * @param array<string, mixed> $options
     */
    private function request(Channel $channel, string $method, string $path, array $options): ResponseInterface
    {
        $options['auth_bearer'] = $channel->apiKey;
        try {
            $response = $this->http->request($method, $path, $options);
        } catch (ExceptionInterface $e) {
            throw new MarketplaceUnavailable('Marketplace unreachable: '.$e->getMessage(), previous: $e);
        }
        $status = $this->status($response);
        if (429 === $status) {
            $retryAfter = $response->getHeaders(false)['retry-after'][0] ?? '';
            $seconds = ctype_digit($retryAfter) ? (int) $retryAfter : 5;
            throw new MarketplaceThrottled(max(1, min($seconds, self::MAX_RETRY_AFTER)));
        }
        if ($status >= 500 || 401 === $status || 403 === $status) {
            throw new MarketplaceUnavailable(\sprintf('Marketplace answered %d on %s %s.', $status, $method, $path));
        }

        return $response;
    }

    private function status(ResponseInterface $response): int
    {
        try {
            return $response->getStatusCode();
        } catch (ExceptionInterface $e) {
            throw new MarketplaceUnavailable('Marketplace unreachable: '.$e->getMessage(), previous: $e);
        }
    }
}
