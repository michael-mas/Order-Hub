<?php

declare(strict_types=1);

namespace App\Domain\Webhook;

/**
 * `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`. The timestamp is
 * signed with the body, so a captured request cannot be replayed later, and
 * the comparison runs in constant time.
 */
final class WebhookSignature
{
    public const int TOLERANCE_SECONDS = 300;

    public static function sign(string $secret, int $timestamp, string $rawBody): string
    {
        return \sprintf('t=%d,v1=%s', $timestamp, hash_hmac('sha256', $timestamp.'.'.$rawBody, $secret));
    }

    public static function verify(string $secret, string $header, string $rawBody, int $now): SignatureCheck
    {
        $parts = [];
        foreach (explode(',', $header) as $part) {
            [$key, $value] = array_pad(explode('=', $part, 2), 2, '');
            $parts[trim($key)] = trim($value);
        }

        $timestamp = $parts['t'] ?? '';
        $received = $parts['v1'] ?? '';
        if ('' === $secret || 1 !== preg_match('/^\d{1,12}$/', $timestamp) || 1 !== preg_match('/^[0-9a-f]{64}$/', $received)) {
            return SignatureCheck::Malformed;
        }
        if (abs($now - (int) $timestamp) > self::TOLERANCE_SECONDS) {
            return SignatureCheck::Expired;
        }
        $expected = hash_hmac('sha256', $timestamp.'.'.$rawBody, $secret);

        return hash_equals($expected, $received) ? SignatureCheck::Valid : SignatureCheck::Mismatch;
    }
}
