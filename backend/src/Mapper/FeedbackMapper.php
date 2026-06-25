<?php

namespace App\Mapper;

use App\Entity\Feedback;
use App\Dto\FeedbackResponse;

class FeedbackMapper
{
    public function toDto(Feedback $feedback): FeedbackResponse
    {
        $dto = new FeedbackResponse();
        $dto->id = $feedback->getId();
        $dto->userId = $feedback->getUser()->getId();
        $dto->username = $feedback->getUser()->getUsername();
        $dto->overallSatisfaction = $feedback->getOverallSatisfaction();
        $dto->easeOfUse = $feedback->getEaseOfUse();
        $dto->contentQuality = $feedback->getContentQuality();
        $dto->messagingRating = $feedback->getMessagingRating();
        $dto->groupsRating = $feedback->getGroupsRating();
        $dto->mentoringRating = $feedback->getMentoringRating();
        $dto->npsScore = $feedback->getNpsScore();
        $dto->comment = $feedback->getComment();
        $dto->status = $feedback->getStatus()->value;
        $dto->createdAt = $feedback->getCreatedAt()->format('c');

        return $dto;
    }
}
