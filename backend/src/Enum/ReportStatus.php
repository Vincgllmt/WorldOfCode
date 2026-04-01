<?php

namespace App\Enum;

enum ReportStatus: string
{
    case PENDING = 'PENDING';
    case IN_PROGRESS = 'IN_PROGRESS';
    case RESOLVED = 'RESOLVED';
    case REJECTED = 'REJECTED';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $s) => $s->value, self::cases());
    }
}
