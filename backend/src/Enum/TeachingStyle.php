<?php

namespace App\Enum;

enum TeachingStyle: string
{
    case GUIDED = 'guided';
    case DIRECT = 'direct';
    case SOCRATIC = 'socratic';
    case COLLABORATIVE = 'collaborative';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $type) => $type->value, self::cases());
    }
}
