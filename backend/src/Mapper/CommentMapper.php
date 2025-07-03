<?php

namespace App\Mapper;

use App\Entity\Comment;
use App\Dto\CommentResponse;

class CommentMapper
{
    public function toDto(Comment $comment): CommentResponse
    {
        $dto = new CommentResponse();
        $dto->id = $comment->getId();
        $dto->content = $comment->getContent();
        $dto->createdAt = $comment->getCreatedAt()?->format('Y-m-d H:i:s');
        $dto->updatedAt = $comment->getUpdatedAt()?->format('Y-m-d H:i:s');
        $dto->authorId = $comment->getAuthor()->getId();
        $dto->authorUsername = $comment->getAuthor()->getUsername();
        $dto->postId = $comment->getPost()->getId();

        return $dto;
    }
}
