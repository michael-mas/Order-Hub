<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Infrastructure\Http\ServiceTokenListener;
use PHPUnit\Framework\Attributes\DataProvider;

final class ServiceTokenTest extends ApiTestCase
{
    /**
     * @return iterable<string, array{string, string}>
     */
    public static function operations(): iterable
    {
        yield 'journal' => ['GET', '/api/journal'];
        yield 'orders' => ['GET', '/api/orders'];
        yield 'one order' => ['GET', '/api/orders/0190a0c4-0000-7000-8000-000000000000'];
        yield 'entrypoint' => ['GET', '/api'];
        yield 'pause' => ['POST', '/api/channels/atlas/pause'];
        yield 'replay' => ['POST', '/api/failed-messages/replay'];
        yield 'analysis' => ['POST', '/api/incident-analyses'];
    }

    /**
     * @dataProvider operations
     */
    #[DataProvider('operations')]
    public function testTheOperationsApiRefusesCallersWithoutTheToken(string $method, string $uri): void
    {
        foreach (['', 'Bearer', 'Bearer wrong-token', 'Basic '.base64_encode('test-api-token'), 'Bearer test-api-token '] as $authorization) {
            $response = $this->request($method, $uri, null, ['Authorization' => $authorization]);

            self::assertSame(401, $response->getStatusCode(), $authorization);
            self::assertSame('Bearer', $response->headers->get('WWW-Authenticate'));
        }
    }

    public function testNothingHappensWithoutTheToken(): void
    {
        $this->request('POST', '/api/channels/atlas/pause', null, ['Authorization' => '']);

        $channels = $this->rows($this->request('GET', '/api/channels'), 'channels');
        self::assertSame(['nova' => false, 'atlas' => false], array_column($channels, 'paused', 'code'));
    }

    public function testTheTokenOpensTheApi(): void
    {
        self::assertSame(200, $this->request('GET', '/api/journal')->getStatusCode());
    }

    public function testHealthAndTheApiDescriptionStayPublic(): void
    {
        self::assertSame(200, $this->request('GET', '/health', null, ['Authorization' => ''])->getStatusCode());
        $docs = $this->request('GET', '/api/docs.jsonopenapi', null, ['Authorization' => '', 'Accept' => 'application/vnd.openapi+json']);
        self::assertSame(200, $docs->getStatusCode());
    }

    public function testOnlyTheApiIsGuarded(): void
    {
        self::assertTrue(ServiceTokenListener::isProtected('/api'));
        self::assertTrue(ServiceTokenListener::isProtected('/api/journal'));
        self::assertTrue(ServiceTokenListener::isProtected('/api/docsx'));
        self::assertTrue(ServiceTokenListener::isProtected('/api/documents'));
        self::assertFalse(ServiceTokenListener::isProtected('/api/docs'));
        self::assertFalse(ServiceTokenListener::isProtected('/api/docs.jsonopenapi'));
        self::assertFalse(ServiceTokenListener::isProtected('/api/contexts/Order'));
        self::assertFalse(ServiceTokenListener::isProtected('/apis'));
        self::assertFalse(ServiceTokenListener::isProtected('/health'));
        self::assertFalse(ServiceTokenListener::isProtected('/webhooks/nova'));
    }
}
