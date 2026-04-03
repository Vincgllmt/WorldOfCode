<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: "FeedbackResponse",
    description: "Represente un retour utilisateur"
)]
class FeedbackResponse
{
    #[OA\Property(type: "integer", example: 1)]
    public int $id;

    #[OA\Property(type: "integer", example: 5)]
    public int $userId;

    #[OA\Property(type: "string", example: "alice")]
    public string $username;

    #[OA\Property(type: "integer", example: 4)]
    public int $overallSatisfaction;

    #[OA\Property(type: "integer", example: 5)]
    public int $easeOfUse;

    #[OA\Property(type: "integer", example: 3)]
    public int $contentQuality;

    #[OA\Property(type: "integer", example: 4, nullable: true)]
    public ?int $messagingRating = null;

    #[OA\Property(type: "integer", example: 5, nullable: true)]
    public ?int $groupsRating = null;

    #[OA\Property(type: "integer", example: 3, nullable: true)]
    public ?int $mentoringRating = null;

    #[OA\Property(type: "integer", example: 8)]
    public int $npsScore;

    #[OA\Property(type: "string", example: "Super plateforme !", nullable: true)]
    public ?string $comment = null;

    #[OA\Property(type: "string", example: "new")]
    public string $status;

    #[OA\Property(type: "string", example: "2026-04-03 14:30:00")]
    public string $createdAt;
}
