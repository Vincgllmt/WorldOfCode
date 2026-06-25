<?php

namespace App\Mapper;

use App\Entity\Report;
use App\Dto\ReportResponse;

class ReportMapper
{
    public function toDto(Report $report): ReportResponse
    {
        $dto = new ReportResponse();
        $dto->id = $report->getId();
        $dto->postId = $report->getPost()?->getId() ?? 0;
        $dto->reason = $report->getReason();
        $dto->userId = $report->getUser()->getId();
        $dto->username = $report->getUser()->getUsername();
        $dto->createdAt = $report->getCreatedAt()->format('c');
        $dto->status = $report->getStatus()->value;
        $dto->claimedByUsername = $report->getClaimedBy()?->getUsername();
        $dto->resolvedByUsername = $report->getResolvedBy()?->getUsername();
        $dto->resolvedAt = $report->getResolvedAt()?->format(\DateTimeInterface::ATOM);
        $dto->resolutionNote = $report->getResolutionNote();

        return $dto;
    }
}
