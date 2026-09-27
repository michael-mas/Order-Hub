<?php

declare(strict_types=1);

namespace App\Tests\Unit\Infrastructure;

use App\Application\AcknowledgementResult;
use App\Application\MarketplaceThrottled;
use App\Application\MarketplaceUnavailable;
use App\Domain\Channel\Channel;
use App\Infrastructure\Marketplace\HttpMarketplaceClient;
use App\Tests\Support\Orders;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\Exception\TransportException;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\JsonMockResponse;
use Symfony\Component\HttpClient\Response\MockResponse;

final class HttpMarketplaceClientTest extends TestCase
{
    private Channel $channel;

    protected function setUp(): void
    {
        $this->channel = new Channel('atlas', 'Atlas', false, 'atlas-key', '', 5);
    }

    public function testListsAPageWithTheQueryTheSimulatorExpects(): void
    {
        $http = new MockHttpClient(function (string $method, string $url, array $options): JsonMockResponse {
            self::assertSame('GET', $method);
            self::assertSame('http://mkp.test/v1/atlas/orders?updated_since=2026-09-26T08:00:00Z&limit=50&page_token=abc', $url);
            $headers = $options['headers'] ?? [];
            self::assertIsArray($headers);
            self::assertContains('Authorization: Bearer atlas-key', $headers);

            return new JsonMockResponse(['orders' => [Orders::payload('ATLS-000001')], 'next_page_token' => 'def']);
        }, 'http://mkp.test');

        $page = new HttpMarketplaceClient($http)->listOrders($this->channel, new \DateTimeImmutable('2026-09-26T10:00:00+02:00'), 'abc', 50);

        self::assertSame('ATLS-000001', $page->orders[0]['id'] ?? null);
        self::assertSame('def', $page->nextPageToken);
    }

    public function testTurnsA429IntoAThrottleWithItsRetryAfter(): void
    {
        $client = $this->client(new MockResponse('{}', ['http_code' => 429, 'response_headers' => ['retry-after' => '7']]));

        try {
            $client->listOrders($this->channel, new \DateTimeImmutable(), null, 50);
            self::fail('Expected a throttle.');
        } catch (MarketplaceThrottled $e) {
            self::assertSame(7, $e->retryAfterSeconds);
        }
    }

    public function testCapsAbsurdRetryAfterValues(): void
    {
        $client = $this->client(new MockResponse('{}', ['http_code' => 429, 'response_headers' => ['retry-after' => '999999']]));

        $this->expectExceptionObject(new MarketplaceThrottled(3600));
        $client->listOrders($this->channel, new \DateTimeImmutable(), null, 50);
    }

    public function testServerErrorsAndGarbageAreUnavailability(): void
    {
        foreach ([
            new MockResponse('{}', ['http_code' => 503]),
            new MockResponse('not json', ['http_code' => 200]),
            new JsonMockResponse(['orders' => 'nope']),
            new MockResponse('', ['error' => 'connection refused']),
        ] as $response) {
            try {
                $this->client($response)->listOrders($this->channel, new \DateTimeImmutable(), null, 50);
                self::fail('Expected unavailability.');
            } catch (MarketplaceUnavailable) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function testMapsAcknowledgementAnswers(): void
    {
        $cases = [201 => AcknowledgementResult::Acknowledged, 200 => AcknowledgementResult::AlreadyAcknowledged, 409 => AcknowledgementResult::Conflict, 404 => AcknowledgementResult::UnknownOrder];
        foreach ($cases as $status => $expected) {
            $http = new MockHttpClient(function (string $method, string $url, array $options) use ($status): MockResponse {
                self::assertSame('POST', $method);
                self::assertStringEndsWith('/v1/atlas/orders/ATLS-000001/acknowledgements', $url);
                self::assertSame('{"merchant_order_ref":"hub-ref"}', $options['body']);

                return new MockResponse('{}', ['http_code' => $status]);
            }, 'http://mkp.test');

            self::assertSame($expected, new HttpMarketplaceClient($http)->acknowledge($this->channel, 'ATLS-000001', 'hub-ref'));
        }
    }

    public function testATransportFailureOnAcknowledgementIsUnavailability(): void
    {
        $http = new MockHttpClient(static fn () => throw new TransportException('timeout'), 'http://mkp.test');

        $this->expectException(MarketplaceUnavailable::class);
        new HttpMarketplaceClient($http)->acknowledge($this->channel, 'ATLS-000001', 'hub-ref');
    }

    private function client(MockResponse $response): HttpMarketplaceClient
    {
        return new HttpMarketplaceClient(new MockHttpClient($response, 'http://mkp.test'));
    }
}
