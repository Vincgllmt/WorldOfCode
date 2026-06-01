<?php

namespace App\Enum;

enum NotificationType: string
{
    case COMMENT = 'comment';
    case FOLLOW = 'follow';
    case LIKE = 'like';
    case MENTORING_NEW_REQUEST = 'mentoring_new_request';
    case MENTORING_REQUEST_ACCEPTED = 'mentoring_request_accepted';
    case MENTORING_PIN_EXPIRED = 'mentoring_pin_expired';
    case MENTORING_RATING_REMINDER = 'mentoring_rating_reminder';
    case MENTORING_SESSION_SCHEDULED = 'mentoring_session_scheduled';
    case APPOINTMENT_CONFIRMED = 'appointment_confirmed';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $type) => $type->value, self::cases());
    }
}
