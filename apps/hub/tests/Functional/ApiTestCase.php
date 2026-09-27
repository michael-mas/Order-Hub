<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Tests\Integration\DatabaseTestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * HTTP requests through the real kernel, inside the rolled-back transaction.
 */
abstract class ApiTestCase extends DatabaseTestCase
{
    /**
     * @param array<string, string> $headers
     */
    protected function request(string $method, string $uri, ?string $body = null, array $headers = []): Response
    {
        $server = ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'];
        foreach ($headers as $name => $value) {
            $server['HTTP_'.strtoupper(str_replace('-', '_', $name))] = $value;
        }

        $kernel = self::$kernel ?? throw new \LogicException('Kernel not booted.');

        return $kernel->handle(Request::create($uri, $method, [], [], [], $server, $body));
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function rows(Response $response, ?string $key = null): array
    {
        $data = $this->json($response);
        $rows = null === $key ? $data : ($data[$key] ?? null);
        self::assertIsArray($rows);
        $list = [];
        foreach ($rows as $row) {
            self::assertIsArray($row);
            $typed = [];
            foreach ($row as $column => $value) {
                $typed[(string) $column] = $value;
            }
            $list[] = $typed;
        }

        return $list;
    }

    /**
     * @return array<mixed>
     */
    protected function json(Response $response): array
    {
        $data = json_decode((string) $response->getContent(), true);
        self::assertIsArray($data, (string) $response->getContent());

        return $data;
    }
}
