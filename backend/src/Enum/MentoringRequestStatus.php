<?php

namespace App\Enum;

enum MentoringRequestStatus: string
{
    case PENDING = 'pending';
    case PINNED = 'pinned';
    case ACCEPTED = 'accepted';
    case CANCELLED = 'cancelled';
    case EXPIRED = 'expired';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $type) => $type->value, self::cases());
    }
}
