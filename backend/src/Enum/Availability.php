<?php

namespace App\Enum;

enum Availability: string
{
    case OPEN_TO_WORK = 'open_to_work';
    case EMPLOYED = 'employed';
    case FREELANCE = 'freelance';
    case STUDENT = 'student';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $a) => $a->value, self::cases());
    }
}
