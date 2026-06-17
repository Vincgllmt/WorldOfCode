<?php

namespace App\Enum;

enum Visibility: string
{
    case PUBLIC = 'PUBLIC';
    case CONNECTED = 'CONNECTED';
    case PRIVATE = 'PRIVATE';

    public static function values(): array
    {
        return array_map(static fn(self $v) => $v->value, self::cases());
    }
}
