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
        $dto->postId = $report->getPost()->getId();
        $dto->reason = $report->getReason();
        $dto->userId = $report->getUser()->getId();
        $dto->username = $report->getUser()->getUsername();
        $dto->createdAt = $report->getCreatedAt()->format('Y-m-d H:i:s');

        return $dto;
    }
}
