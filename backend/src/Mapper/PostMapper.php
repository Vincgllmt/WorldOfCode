<?php

namespace App\Mapper;

use App\Dto\PostResponse;
use App\Dto\SharedPostResponse;
use App\Entity\Post;
use App\Entity\User;

class PostMapper
{
    public function toDto(Post $post, ?User $currentUser = null, ?int $commentsCount = null, ?int $sharedCount = null): PostResponse
    {
        $dto = new PostResponse();
        $dto->id = $post->getId();
        $dto->content = $post->getContent();
        $dto->createdAt = $post->getCreatedAt()?->format('c');
        $dto->updatedAt = $post->getUpdatedAt()?->format('c');
        $dto->authorId = $post->getAuthor()->getId();
        $dto->authorUsername = $post->getAuthor()->getUsername();
        $dto->authorAvatarUrl = $post->getAuthor()->getAvatarUrl();
        $dto->techGroupId = $post->getTechGroup()?->getId();
        $dto->techGroupName = $post->getTechGroup()?->getName();
        $dto->likesCount = $post->getLikes()->count();
        $dto->likedByUser = $this->isLikedByUser($post, $currentUser);

        if ($post->getSharedFrom()) {
            $dto->sharedPost = $this->mapSharedPost($post->getSharedFrom(), $currentUser);
        }

        // Use pre-computed counts when available to avoid N+1 lazy loading
        $dto->sharedCount = $sharedCount ?? $post->getSharedPosts()->count();
        $dto->commentsCount = $commentsCount ?? $post->getComments()->count();

        return $dto;
    }

    private function mapSharedPost(Post $sharedPost, ?User $currentUser = null): SharedPostResponse
    {
        $dto = new SharedPostResponse();
        $dto->id = $sharedPost->getId();
        $dto->content = $sharedPost->getContent();
        $dto->createdAt = $sharedPost->getCreatedAt()?->format('c');
        $dto->updatedAt = $sharedPost->getUpdatedAt()?->format('c');
        $dto->authorId = $sharedPost->getAuthor()->getId();
        $dto->authorUsername = $sharedPost->getAuthor()->getUsername();
        $dto->authorAvatarUrl = $sharedPost->getAuthor()->getAvatarUrl();
        $dto->techGroupId = $sharedPost->getTechGroup()?->getId();
        $dto->techGroupName = $sharedPost->getTechGroup()?->getName();
        $dto->likesCount = $sharedPost->getLikes()->count();
        $dto->sharedCount = $sharedPost->getSharedPosts()->count();
        $dto->likedByUser = $this->isLikedByUser($sharedPost, $currentUser);

        return $dto;
    }

    private function isLikedByUser(Post $post, ?User $currentUser = null): bool
    {
        if (!$currentUser) {
            return false;
        }

        foreach ($post->getLikes() as $like) {
            if ($like->getUser() && $like->getUser()->getId() === $currentUser->getId()) {
                return true;
            }
        }

        return false;
    }
}
