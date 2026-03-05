<?php

namespace App\Mapper;

use App\Entity\Notification;
use App\Dto\NotificationResponse;

class NotificationMapper
{
    public function toDto(Notification $notification): NotificationResponse
    {
        $dto = new NotificationResponse();
        $dto->id = $notification->getId();
        $dto->type = $notification->getType()->value;
        $dto->message = $notification->getMessage();
        $dto->relatedEntityId = $notification->getRelatedEntityId();
        $dto->isRead = $notification->getIsRead();
        $dto->createdAt = $notification->getCreatedAt()->format('Y-m-d H:i:s');
        $dto->senderId = $notification->getSender()->getId();
        $dto->senderUsername = $notification->getSender()->getUsername();

        return $dto;
    }
}
