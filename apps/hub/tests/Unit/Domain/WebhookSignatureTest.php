<?php

declare(strict_types=1);

namespace App\Tests\Unit\Domain;

use App\Domain\Webhook\SignatureCheck;
use App\Domain\Webhook\WebhookSignature;
use PHPUnit\Framework\TestCase;

final class WebhookSignatureTest extends TestCase
{
    private const string BODY = '{"event_id":"evt_1"}';

    /**
     * Produced by the TypeScript simulator (apps/marketplace/src/signature.ts):
     * both sides of the contract must agree byte for byte.
     */
    public function testAcceptsTheSignatureTheSimulatorProduces(): void
    {
        $header = 't=1790000000,v1=144db1fb84b56daea222d6bb6c7ab6ad630b48d511c1d50f38a857d4fd75c6d2';

        self::assertSame(SignatureCheck::Valid, WebhookSignature::verify('whsec_test', $header, self::BODY, 1790000000));
        self::assertSame($header, WebhookSignature::sign('whsec_test', 1790000000, self::BODY));
    }

    public function testRejectsATamperedBodyOrAnotherSecret(): void
    {
        $header = WebhookSignature::sign('secret', 1000, self::BODY);

        self::assertSame(SignatureCheck::Mismatch, WebhookSignature::verify('secret', $header, self::BODY.' ', 1000));
        self::assertSame(SignatureCheck::Mismatch, WebhookSignature::verify('other', $header, self::BODY, 1000));
    }

    public function testRejectsReplaysOutsideTheTolerance(): void
    {
        $header = WebhookSignature::sign('secret', 1000, self::BODY);

        self::assertSame(SignatureCheck::Valid, WebhookSignature::verify('secret', $header, self::BODY, 1000 + 300));
        self::assertSame(SignatureCheck::Expired, WebhookSignature::verify('secret', $header, self::BODY, 1000 + 301));
        self::assertSame(SignatureCheck::Expired, WebhookSignature::verify('secret', $header, self::BODY, 1000 - 301));
    }

    /**
     * @dataProvider malformedHeaders
     */
    #[\PHPUnit\Framework\Attributes\DataProvider('malformedHeaders')]
    public function testRejectsMalformedHeaders(string $header): void
    {
        self::assertSame(SignatureCheck::Malformed, WebhookSignature::verify('secret', $header, self::BODY, 1000));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function malformedHeaders(): iterable
    {
        yield 'empty' => [''];
        yield 'garbage' => ['nonsense'];
        yield 'no digest' => ['t=1000,v1='];
        yield 'short digest' => ['t=1000,v1=abc'];
        yield 'no timestamp' => ['v1='.str_repeat('a', 64)];
        yield 'negative timestamp' => ['t=-5,v1='.str_repeat('a', 64)];
    }

    public function testAnEmptySecretNeverValidates(): void
    {
        $header = WebhookSignature::sign('', 1000, self::BODY);

        self::assertSame(SignatureCheck::Malformed, WebhookSignature::verify('', $header, self::BODY, 1000));
    }
}
