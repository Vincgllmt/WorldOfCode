<?php

namespace App\Mapper;

use App\Entity\Messaging\Message;
use App\Dto\MessageResponse;

class MessageMapper
{
    public function toDto(Message $msg): MessageResponse
    {
        $dto = new MessageResponse();
        $dto->id = $msg->getId();
        $dto->body = $msg->getBody();
        $dto->type = $msg->getType();
        $dto->createdAt = $msg->getCreatedAt()->format('Y-m-d H:i:s');
        $dto->editedAt = $msg->getEditedAt()?->format('Y-m-d H:i:s');
        $dto->deletedAt = $msg->getDeletedAt()?->format('Y-m-d H:i:s');
        $dto->senderId = $msg->getSender()->getId();
        $dto->senderUsername = $msg->getSender()->getUsername();
        $dto->conversationId = $msg->getConversation()->getId();

        return $dto;
    }
}
