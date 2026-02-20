<?php

namespace App\Enum;

enum LinkType: string
{
    case GITHUB = 'github';
    case GITLAB = 'gitlab';
    case LINKEDIN = 'linkedin';
    case PORTFOLIO = 'portfolio';
    case OTHER = 'other';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $t) => $t->value, self::cases());
    }
}
