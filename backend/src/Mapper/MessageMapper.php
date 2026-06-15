<?php

namespace App\Mapper;

use App\Entity\Messaging\Message;
use App\Dto\MessageResponse;
use App\Repository\Messaging\MessageReadRepository;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use App\Entity\User;

class MessageMapper
{
    public function __construct(
        private TokenStorageInterface $tokenStorage,
        private MessageReadRepository $messageReadRepo
    ) {}

    public function toDto(Message $msg): MessageResponse
    {
        $dto = new MessageResponse();
        $dto->id = $msg->getId();
        $dto->body = $msg->getBody();
        $dto->type = $msg->getType();
        $dto->createdAt = $msg->getCreatedAt()->format('c');
        $dto->editedAt = $msg->getEditedAt()?->format('c');
        $dto->deletedAt = $msg->getDeletedAt()?->format('c');
        $dto->sender = [
            'id' => (string) $msg->getSender()->getId(),
            'username' => $msg->getSender()->getUsername(),
        ];

        $dto->conversationId = $msg->getConversation()->getId();
        $currentUser = $this->tokenStorage->getToken()?->getUser();
        if ($currentUser instanceof User) {
            $dto->read = $this->messageReadRepo->isReadByUser($msg, $currentUser);
        } else {
            $dto->read = false;
        }
        return $dto;
    }
}
