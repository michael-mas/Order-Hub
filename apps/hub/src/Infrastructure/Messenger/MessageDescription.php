<?php

declare(strict_types=1);

namespace App\Infrastructure\Messenger;

use App\Application\Message\AcknowledgeOrder;
use App\Application\Message\IngestOrder;
use App\Application\Message\PollChannel;

/**
 * Reads what operators need from a queued message. Messages outlive deploys:
 * one serialized by an older version may lack a property added since, and
 * describing it must not fail.
 */
final class MessageDescription
{
    public static function type(object $message): string
    {
        return new \ReflectionClass($message)->getShortName();
    }

    public static function channel(object $message): ?string
    {
        return match (true) {
            $message instanceof IngestOrder, $message instanceof PollChannel, $message instanceof AcknowledgeOrder => self::initialized($message, 'channel'),
            default => null,
        };
    }

    public static function orderId(object $message): ?string
    {
        return $message instanceof AcknowledgeOrder ? self::initialized($message, 'orderId') : null;
    }

    private static function initialized(object $message, string $property): ?string
    {
        $reflection = new \ReflectionProperty($message, $property);
        $value = $reflection->isInitialized($message) ? $reflection->getValue($message) : null;

        return \is_string($value) ? $value : null;
    }
}
