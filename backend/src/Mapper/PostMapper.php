<?php

// namespace App\Mapper;

// use App\Dto\PostResponse;
// use App\Entity\Post;
// use App\Dto\SharedPostResponse;

// class PostMapper
// {
//     public function toDto(Post $post): PostResponse
//     {
//         $dto = new PostResponse();
//         $dto->id = $post->getId();
//         $dto->content = $post->getContent();
//         $dto->createdAt = $post->getCreatedAt()?->format('Y-m-d H:i:s');
//         $dto->updatedAt = $post->getUpdatedAt()?->format('Y-m-d H:i:s');
//         $dto->authorId = $post->getAuthor()->getId();
//         $dto->techGroupId = $post->getTechGroup()->getId();
//         $dto->likesCount = $post->getLikes()->count();
//         if ($post->getSharedFrom()) {
//             $shared = new SharedPostResponse();
//             $shared->id = $post->getSharedFrom()->getId();
//             $shared->content = $post->getSharedFrom()->getContent();
//             $shared->authorId = $post->getSharedFrom()->getAuthor()->getId();
//             $dto->sharedFrom = $shared;
//         }
//         if ($post->getSharedFrom()) {
//             $shared = new SharedPostResponse();
//             $shared->id = $post->getSharedFrom()->getId();
//             $shared->content = $post->getSharedFrom()->getContent();
//             $shared->authorId = $post->getSharedFrom()->getAuthor()->getId();
//             $dto->sharedFrom = $shared;
//         }

//         return $dto;
//     }
// }
namespace App\Mapper;

use App\Dto\PostResponse;
use App\Entity\Post;
use App\Entity\User;
use App\Dto\SharedPostResponse;

class PostMapper
{
    public function toDto(Post $post, ?User $currentUser = null): PostResponse
    {
        $dto = new PostResponse();
        $dto->id = $post->getId();
        $dto->content = $post->getContent();
        $dto->createdAt = $post->getCreatedAt()?->format('Y-m-d H:i:s');
        $dto->updatedAt = $post->getUpdatedAt()?->format('Y-m-d H:i:s');
        $dto->authorId = $post->getAuthor()->getId();
        $dto->authorUsername = $post->getAuthor()->getUsername();
        $dto->techGroupId = $post->getTechGroup()->getId();
        $dto->techGroupName = $post->getTechGroup()->getName();
        $dto->likesCount = $post->getLikes()->count();

        // 🔹 Vérifie si l'utilisateur connecté a liké ce post
        $dto->likedByUser = false;
        if ($currentUser) {
            foreach ($post->getLikes() as $like) {
                if ($like->getUser() && $like->getUser()->getId() === $currentUser->getId()) {
                    $dto->likedByUser = true;
                    break;
                }
            }
        }

        // 🔹 Si le post est un partage
        if ($post->getSharedFrom()) {
            $sharedPost = $post->getSharedFrom();
            $shared = new SharedPostResponse();
            $shared->id = $sharedPost->getId();
            $shared->content = $sharedPost->getContent();
            $shared->authorId = $sharedPost->getAuthor()->getId();
            $shared->authorUsername = $sharedPost->getAuthor()->getUsername();
            $dto->sharedFrom = $shared;
        }

        $dto->sharedCount = $post->getSharedPosts()->count();

        return $dto;
    }
}
