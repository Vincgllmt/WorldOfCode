<?php

namespace App\Enum;

enum PaymentStatus: string
{
    case PENDING   = 'pending';
    case SUCCEEDED = 'succeeded';
    case FAILED    = 'failed';
    case CANCELED  = 'canceled';
}
