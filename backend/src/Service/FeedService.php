<?php

namespace App\Service;

use App\Dto\FeedItemResponse;
use App\Entity\User;
use App\Mapper\PostMapper;
use App\Mapper\TechWatchItemMapper;
use App\Repository\PostRepository;
use App\Repository\TechWatchItemRepository;

class FeedService
{
    /**
     * Nombre de posts entre deux items RSS.
     */
    private const RSS_INTERVAL = 5;

    public function __construct(
        private PostRepository $postRepo,
        private TechWatchItemRepository $techWatchItemRepo,
        private PostMapper $postMapper,
        private TechWatchItemMapper $techWatchItemMapper,
    ) {}

    /**
     * @return array{items: FeedItemResponse[], page: int, limit: int, totalItems: int, totalPages: int}
     */
    public function getFeed(User $user, int $page, int $limit): array
    {
        $postResult = $this->postRepo->findScoredFeedForUser($user, $page, $limit);

        $rssPerPage = (int) ceil($limit / self::RSS_INTERVAL);
        $rssOffset = ($page - 1) * $rssPerPage;
        $rssItems = $this->techWatchItemRepo->findForUserGroups($user, $rssPerPage, $rssOffset);

        $items = $this->interleave($postResult['items'], $rssItems, $user);

        return [
            'items' => $items,
            'page' => $page,
            'limit' => $limit,
            'totalItems' => $postResult['totalItems'],
            'totalPages' => (int) ceil($postResult['totalItems'] / $limit),
        ];
    }

    /**
     * Insère un item RSS toutes les RSS_INTERVAL entrées posts.
     *
     * @param \App\Entity\Post[] $posts
     * @param \App\Entity\TechWatchItem[] $rssItems
     * @return FeedItemResponse[]
     */
    private function interleave(array $posts, array $rssItems, User $user): array
    {
        $result = [];
        $rssIndex = 0;
        $postCount = 0;

        foreach ($posts as $post) {
            $item = new FeedItemResponse();
            $item->type = 'post';
            $item->post = $this->postMapper->toDto($post, $user);
            $result[] = $item;

            $postCount++;

            if ($postCount % self::RSS_INTERVAL === 0 && $rssIndex < count($rssItems)) {
                $rssItem = new FeedItemResponse();
                $rssItem->type = 'rss_item';
                $rssItem->rssItem = $this->techWatchItemMapper->toDto($rssItems[$rssIndex]);
                $result[] = $rssItem;
                $rssIndex++;
            }
        }

        return $result;
    }
}
