<?php

namespace App\Enum;

enum MentoringRequestType: string
{
    case DEBUG = 'debug';
    case ONE_TO_ONE = 'one_to_one';
    case EXERCISE = 'exercise';
    case CODE_REVIEW = 'code_review';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $type) => $type->value, self::cases());
    }
}
