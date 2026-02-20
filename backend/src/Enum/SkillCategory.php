<?php

namespace App\Enum;

enum SkillCategory: string
{
    case LANGUAGE = 'language';
    case FRONTEND = 'frontend';
    case BACKEND = 'backend';
    case MOBILE = 'mobile';
    case DATABASE = 'database';
    case DEVOPS = 'devops';
    case CLOUD = 'cloud';
    case DESIGN = 'design';
    case TOOLS = 'tools';
    case TESTING = 'testing';
    case SECURITY = 'security';
    case DATA = 'data';
    case OTHER = 'other';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $c) => $c->value, self::cases());
    }
}
