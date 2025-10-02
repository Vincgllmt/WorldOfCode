<?php

namespace App\Mapper;

use App\Entity\Messaging\Conversation;
use App\Dto\ConversationResponse;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use App\Dto\LastMessageResponse;
use App\Repository\MessageRepository;

class ConversationMapper
{
    public function __construct(
        private TokenStorageInterface $tokenStorage,
        private MessageRepository $messageRepo
    ) {}

    public function toDto(Conversation $conv): ConversationResponse
    {
        $dto = new ConversationResponse();
        $dto->id = $conv->getId();
        $dto->type = $conv->getType();
        $dto->title = $conv->getTitle();
        $dto->createdAt = $conv->getCreatedAt()->format('Y-m-d H:i:s');

        $dto->participants = [];

        /** @var UserInterface|null $currentUser */
        $currentUser = $this->tokenStorage->getToken()?->getUser();
        if ($conv->getType() === 'direct' && $currentUser) {
            foreach ($conv->getParticipants() as $participant) {
                if ($participant->getUser()->getUserIdentifier() !== $currentUser?->getUserIdentifier()) {
                    $dto->participants[] = [
                        'id' => $participant->getUser()->getId(),
                        'username' => $participant->getUser()->getUsername(),
                    ];
                }
            }
        } else {
            foreach ($conv->getParticipants() as $participant) {
                $dto->participants[] = [
                    'id' => $participant->getUser()->getId(),
                    'username' => $participant->getUser()->getUsername(),
                ];
            }
        }

        // Last message
        $lastMsg = $this->messageRepo->findLastByConversation($conv);
        if ($lastMsg) {
            $msgDto = new LastMessageResponse();
            $msgDto->id = $lastMsg->getId();
            $msgDto->body = $lastMsg->getBody();
            $msgDto->createdAt = $lastMsg->getCreatedAt()->format('Y-m-d H:i:s');
            $msgDto->sender = [
                'id' => $lastMsg->getSender()->getId(),
                'username' => $lastMsg->getSender()->getUsername(),
            ];
            $dto->lastMessage = $msgDto;
        }
        return $dto;
    }
}
