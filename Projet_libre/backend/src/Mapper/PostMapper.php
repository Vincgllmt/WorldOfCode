<?php

namespace App\Mapper;

use App\Dto\PostResponse;
use App\Entity\Post;

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

        return $dto;
    }
}
