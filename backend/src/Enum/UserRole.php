<?php

namespace App\Enum;

enum UserRole: string
{
    case ROLE_USER = 'ROLE_USER';
    case ROLE_ADMIN = 'ROLE_ADMIN';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $role) => $role->value, self::cases());
    }
}
