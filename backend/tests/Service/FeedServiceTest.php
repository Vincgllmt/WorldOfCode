<?php

namespace App\Tests\Service;

use App\Dto\PostResponse;
use App\Dto\TechWatchItemResponse;
use App\Entity\Post;
use App\Entity\TechWatchItem;
use App\Entity\User;
use App\Enum\UserRole;
use App\Mapper\PostMapper;
use App\Mapper\TechWatchItemMapper;
use App\Repository\PostRepository;
use App\Repository\TechWatchItemRepository;
use App\Service\FeedService;
use PHPUnit\Framework\TestCase;

/**
 * 🎮 Stardew Valley - Tests unitaires du FeedService
 *
 * Farmer   = utilisateur courant (consulte son feed)
 * Penny    = autrice de posts dans le feed
 */
class FeedServiceTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'Farmer'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@stardewvalley.farm')
            ->setFirstname($username)
            ->setLastname('Valley')
            ->setPassword('hashed')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function makePostResponse(int $id): PostResponse
    {
        $dto = new PostResponse();
        $dto->id = $id;
        $dto->content = "Post content {$id}";
        $dto->createdAt = '2026-01-01 10:00:00';
        $dto->authorId = 1;
        $dto->authorUsername = 'Farmer';
        $dto->techGroupId = 1;
        $dto->techGroupName = 'Farming';
        return $dto;
    }

    private function makeRssResponse(int $id): TechWatchItemResponse
    {
        $dto = new TechWatchItemResponse();
        $dto->id = $id;
        $dto->title = "RSS Article {$id}";
        $dto->url = "https://example.com/article-{$id}";
        $dto->fetchedAt = '2026-01-01 09:00:00';
        $dto->sourceName = 'Tech Blog';
        return $dto;
    }

    /** @return Post[] */
    private function makeMockPosts(int $count): array
    {
        return array_map(fn($i) => $this->createMock(Post::class), range(1, $count));
    }

    /** @return TechWatchItem[] */
    private function makeMockRssItems(int $count): array
    {
        return array_map(fn($i) => $this->createMock(TechWatchItem::class), range(1, $count));
    }

    private function makeService(
        PostRepository $postRepo,
        TechWatchItemRepository $itemRepo,
        PostMapper $postMapper,
        TechWatchItemMapper $itemMapper,
    ): FeedService {
        return new FeedService($postRepo, $itemRepo, $postMapper, $itemMapper);
    }

    // ======================================================================
    //  getFeed() — cas vides
    // ======================================================================

    public function testGetFeedReturnsEmptyItemsWhenNoContent(): void
    {
        $farmer = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findScoredFeedForUser')->willReturn(['items' => [], 'totalItems' => 0]);

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('findForUserGroups')->willReturn([]);

        $service = $this->makeService(
            $postRepo,
            $itemRepo,
            $this->createMock(PostMapper::class),
            $this->createMock(TechWatchItemMapper::class),
        );

        $result = $service->getFeed($farmer, 1, 20);

        $this->assertSame([], $result['items']);
        $this->assertSame(0, $result['totalItems']);
        $this->assertSame(0, $result['totalPages']);
    }

    public function testGetFeedReturnsOnlyPostsWhenNoRssItems(): void
    {
        $farmer = $this->buildUser(1);
        $posts  = $this->makeMockPosts(3);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findScoredFeedForUser')->willReturn(['items' => $posts, 'totalItems' => 3]);

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('findForUserGroups')->willReturn([]);

        $postMapper = $this->createMock(PostMapper::class);
        $postMapper->method('toDto')->willReturnCallback(
            fn(Post $p, User $u) => $this->makePostResponse(1)
        );

        $service = $this->makeService(
            $postRepo,
            $itemRepo,
            $postMapper,
            $this->createMock(TechWatchItemMapper::class),
        );

        $result = $service->getFeed($farmer, 1, 20);

        $this->assertCount(3, $result['items']);
        foreach ($result['items'] as $item) {
            $this->assertSame('post', $item->type);
            $this->assertNotNull($item->post);
            $this->assertNull($item->rssItem);
        }
    }

    // ======================================================================
    //  getFeed() — interleaving
    // ======================================================================

    public function testGetFeedDoesNotInjectRssWhenFewerThanFivePosts(): void
    {
        $farmer   = $this->buildUser(1);
        $posts    = $this->makeMockPosts(3);
        $rssItems = $this->makeMockRssItems(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findScoredFeedForUser')->willReturn(['items' => $posts, 'totalItems' => 3]);

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('findForUserGroups')->willReturn($rssItems);

        $postMapper = $this->createMock(PostMapper::class);
        $postMapper->method('toDto')->willReturn($this->makePostResponse(1));

        $itemMapper = $this->createMock(TechWatchItemMapper::class);
        $itemMapper->expects($this->never())->method('toDto');

        $service = $this->makeService($postRepo, $itemRepo, $postMapper, $itemMapper);

        $result = $service->getFeed($farmer, 1, 20);

        $this->assertCount(3, $result['items']);
        $types = array_column($result['items'], 'type');
        $this->assertNotContains('rss_item', $types);
    }

    public function testGetFeedInjectsOneRssItemAfterFivePosts(): void
    {
        $farmer   = $this->buildUser(1);
        $posts    = $this->makeMockPosts(5);
        $rssItems = $this->makeMockRssItems(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findScoredFeedForUser')->willReturn(['items' => $posts, 'totalItems' => 5]);

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('findForUserGroups')->willReturn($rssItems);

        $postMapper = $this->createMock(PostMapper::class);
        $postMapper->method('toDto')->willReturn($this->makePostResponse(1));

        $itemMapper = $this->createMock(TechWatchItemMapper::class);
        $itemMapper->method('toDto')->willReturn($this->makeRssResponse(1));

        $service = $this->makeService($postRepo, $itemRepo, $postMapper, $itemMapper);

        $result = $service->getFeed($farmer, 1, 20);

        // 5 posts + 1 rss = 6 items
        $this->assertCount(6, $result['items']);
        // Les 5 premiers sont des posts
        for ($i = 0; $i < 5; $i++) {
            $this->assertSame('post', $result['items'][$i]->type);
        }
        // Le 6e est un item RSS
        $this->assertSame('rss_item', $result['items'][5]->type);
        $this->assertNotNull($result['items'][5]->rssItem);
        $this->assertNull($result['items'][5]->post);
    }

    public function testGetFeedInterleavesTwoRssItemsWithTenPosts(): void
    {
        $farmer   = $this->buildUser(1);
        $posts    = $this->makeMockPosts(10);
        $rssItems = $this->makeMockRssItems(2);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findScoredFeedForUser')->willReturn(['items' => $posts, 'totalItems' => 10]);

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('findForUserGroups')->willReturn($rssItems);

        $postMapper = $this->createMock(PostMapper::class);
        $postMapper->method('toDto')->willReturn($this->makePostResponse(1));

        $itemMapper = $this->createMock(TechWatchItemMapper::class);
        $itemMapper->method('toDto')->willReturn($this->makeRssResponse(1));

        $service = $this->makeService($postRepo, $itemRepo, $postMapper, $itemMapper);

        $result = $service->getFeed($farmer, 1, 20);

        // 10 posts + 2 rss = 12 items
        $this->assertCount(12, $result['items']);

        // RSS inséré à l'index 5 (après les 5 premiers posts)
        $this->assertSame('rss_item', $result['items'][5]->type);
        // RSS inséré à l'index 11 (après les 5 posts suivants)
        $this->assertSame('rss_item', $result['items'][11]->type);

        // Les autres sont des posts
        $types = array_column($result['items'], 'type');
        $this->assertSame(10, count(array_filter($types, fn($t) => $t === 'post')));
        $this->assertSame(2, count(array_filter($types, fn($t) => $t === 'rss_item')));
    }

    public function testGetFeedDoesNotInsertMoreRssThanAvailable(): void
    {
        $farmer   = $this->buildUser(1);
        $posts    = $this->makeMockPosts(10);
        $rssItems = $this->makeMockRssItems(1); // 1 seul item RSS dispo alors qu'on pourrait en injecter 2

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findScoredFeedForUser')->willReturn(['items' => $posts, 'totalItems' => 10]);

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('findForUserGroups')->willReturn($rssItems);

        $postMapper = $this->createMock(PostMapper::class);
        $postMapper->method('toDto')->willReturn($this->makePostResponse(1));

        $itemMapper = $this->createMock(TechWatchItemMapper::class);
        $itemMapper->expects($this->once())->method('toDto')->willReturn($this->makeRssResponse(1));

        $service = $this->makeService($postRepo, $itemRepo, $postMapper, $itemMapper);

        $result = $service->getFeed($farmer, 1, 20);

        // 10 posts + 1 rss = 11 items
        $this->assertCount(11, $result['items']);
        $types = array_column($result['items'], 'type');
        $this->assertSame(1, count(array_filter($types, fn($t) => $t === 'rss_item')));
    }

    // ======================================================================
    //  getFeed() — pagination
    // ======================================================================

    public function testGetFeedPassesCorrectPageAndLimitToPostRepo(): void
    {
        $farmer = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->expects($this->once())
            ->method('findScoredFeedForUser')
            ->with($farmer, 3, 10)
            ->willReturn(['items' => [], 'totalItems' => 0]);

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('findForUserGroups')->willReturn([]);

        $service = $this->makeService(
            $postRepo,
            $itemRepo,
            $this->createMock(PostMapper::class),
            $this->createMock(TechWatchItemMapper::class),
        );

        $service->getFeed($farmer, 3, 10);
    }

    public function testGetFeedUsesCorrectRssOffsetOnPage2(): void
    {
        $farmer = $this->buildUser(1);

        // limit=20, RSS_INTERVAL=5 → rssPerPage = ceil(20/5) = 4
        // page=2 → rssOffset = (2-1) * 4 = 4
        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findScoredFeedForUser')->willReturn(['items' => [], 'totalItems' => 0]);

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->expects($this->once())
            ->method('findForUserGroups')
            ->with($farmer, 4, 4)
            ->willReturn([]);

        $service = $this->makeService(
            $postRepo,
            $itemRepo,
            $this->createMock(PostMapper::class),
            $this->createMock(TechWatchItemMapper::class),
        );

        $service->getFeed($farmer, 2, 20);
    }

    public function testGetFeedReturnsCorrectPaginationMetadata(): void
    {
        $farmer = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findScoredFeedForUser')->willReturn(['items' => [], 'totalItems' => 45]);

        $itemRepo = $this->createMock(TechWatchItemRepository::class);
        $itemRepo->method('findForUserGroups')->willReturn([]);

        $service = $this->makeService(
            $postRepo,
            $itemRepo,
            $this->createMock(PostMapper::class),
            $this->createMock(TechWatchItemMapper::class),
        );

        $result = $service->getFeed($farmer, 2, 20);

        $this->assertSame(2, $result['page']);
        $this->assertSame(20, $result['limit']);
        $this->assertSame(45, $result['totalItems']);
        $this->assertSame(3, $result['totalPages']); // ceil(45/20) = 3
    }
}
