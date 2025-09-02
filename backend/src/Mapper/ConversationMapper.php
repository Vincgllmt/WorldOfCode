<?php

namespace App\Mapper;

use App\Entity\Messaging\Conversation;
use App\Dto\ConversationResponse;

class ConversationMapper
{
    public function toDto(Conversation $conv): ConversationResponse
    {
        $dto = new ConversationResponse();
        $dto->id = $conv->getId();
        $dto->type = $conv->getType();
        $dto->title = $conv->getTitle();
        $dto->createdAt = $conv->getCreatedAt()->format('Y-m-d H:i:s');
        $dto->participantIds = [];
        foreach ($conv->getParticipants() as $participant) {
            $dto->participantIds[] = $participant->getUser()->getId();
        }

        return $dto;
    }
}
