<?php

namespace App\Enum;

enum SuggestionStatus: string
{
    case PENDING     = 'PENDING';
    case IN_PROGRESS = 'IN_PROGRESS';
    case APPROVED    = 'APPROVED';
    case REJECTED    = 'REJECTED';

    public static function values(): array
    {
        return array_map(static fn(self $s) => $s->value, self::cases());
    }
}
