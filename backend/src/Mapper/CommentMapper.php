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
        $dto->createdAt = $comment->getCreatedAt()?->format('c');
        $dto->updatedAt = $comment->getUpdatedAt()?->format('c');
        $dto->authorId = $comment->getAuthor()->getId();
        $dto->authorUsername = $comment->getAuthor()->getUsername();
        $dto->postId = $comment->getPost()->getId();

        return $dto;
    }
}
