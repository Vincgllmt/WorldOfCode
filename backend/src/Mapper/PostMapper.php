<?php

namespace App\Mapper;

use App\Dto\PostResponse;
use App\Entity\Post;
use App\Dto\SharedPostResponse;

class PostMapper
{
    public function toDto(Post $post): PostResponse
    {
        $dto = new PostResponse();
        $dto->id = $post->getId();
        $dto->content = $post->getContent();
        $dto->createdAt = $post->getCreatedAt()?->format('Y-m-d H:i:s');
        $dto->updatedAt = $post->getUpdatedAt()?->format('Y-m-d H:i:s');
        $dto->authorId = $post->getAuthor()->getId();
        $dto->techGroupId = $post->getTechGroup()->getId();
        if ($post->getSharedFrom()) {
            $shared = new SharedPostResponse();
            $shared->id = $post->getSharedFrom()->getId();
            $shared->content = $post->getSharedFrom()->getContent();
            $shared->authorId = $post->getSharedFrom()->getAuthor()->getId();
            $dto->sharedFrom = $shared;
        }


        return $dto;
    }
}
