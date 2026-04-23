<?php

namespace App\Dto;

use OpenApi\Attributes as OA;

#[OA\Schema(
    title: 'FeedItemResponse',
    description: 'Un élément du feed : post utilisateur ou article RSS'
)]
class FeedItemResponse
{
    #[OA\Property(
        description: "Type de l'élément",
        type: 'string',
        enum: ['post', 'rss_item'],
        example: 'post'
    )]
    public string $type;

    #[OA\Property(
        description: 'Post utilisateur (présent si type = post)',
        nullable: true
    )]
    public ?PostResponse $post = null;

    #[OA\Property(
        description: 'Article RSS (présent si type = rss_item)',
        nullable: true
    )]
    public ?TechWatchItemResponse $rssItem = null;
}
