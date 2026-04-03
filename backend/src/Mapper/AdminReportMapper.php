<?php

namespace App\Mapper;

use App\Entity\Report;
use App\Dto\AdminReportDto;

class AdminReportMapper
{
    public function toDto(Report $report): AdminReportDto
    {
        $post = $report->getPost();

        $postExcerpt = null;
        if ($post) {
            $content = $post->getContent() ?? '';
            $postExcerpt = mb_strlen($content) > 50
                ? mb_substr($content, 0, 50) . '…'
                : ($content ?: null);
        }

        return new AdminReportDto(
            id: $report->getId(),
            postId: $post?->getId(),
            postExcerpt: $postExcerpt,
            postContent: $post?->getContent(),
            postAuthorUsername: $post?->getAuthor()?->getUsername(),
            postAuthorId: $post?->getAuthor()?->getId(),
            postTechGroupName: $post?->getTechGroup()?->getName(),
            postLikesCount: $post ? $post->getLikes()->count() : null,
            postCommentsCount: $post ? $post->getComments()->count() : null,
            reportedByUsername: $report->getUser()->getUsername(),
            reason: $report->getReason(),
            createdAt: $report->getCreatedAt()->format(\DateTimeInterface::ATOM),
            status: $report->getStatus()->value,
            claimedByUsername: $report->getClaimedBy()?->getUsername(),
            claimedAt: $report->getClaimedAt()?->format(\DateTimeInterface::ATOM),
            resolvedByUsername: $report->getResolvedBy()?->getUsername(),
            resolvedAt: $report->getResolvedAt()?->format(\DateTimeInterface::ATOM),
            resolutionNote: $report->getResolutionNote(),
        );
    }
}
