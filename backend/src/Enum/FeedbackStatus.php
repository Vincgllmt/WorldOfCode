<?php

namespace App\Enum;

enum FeedbackStatus: string
{
    case NEW = 'new';
    case READ = 'read';
    case PROCESSED = 'processed';
}
