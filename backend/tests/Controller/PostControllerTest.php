<?php

namespace App\Tests\Controller;

use App\Controller\PostController;
use App\Service\Moderation\TextModerationService;
use App\Entity\Post;
use App\Entity\TechGroup;
use App\Entity\User;
use App\Enum\NotificationType;
use App\Enum\UserRole;
use App\Mapper\CommentMapper;
use App\Mapper\LikeMapper;
use App\Mapper\PostMapper;
use App\Repository\LikeRepository;
use App\Repository\PostRepository;
use App\Repository\TechGroupRepository;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Elden Ring - Tests unitaires du PostController
 *
 * Tarnished = utilisateur authentifié courant (auteur des posts)
 * Malenia   = autre utilisateur (contrôle d'accès, auteur alternatif)
 */
class PostControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'Tarnished', bool $isAdmin = false): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@erdtree.lands')
            ->setFirstname($username)
            ->setLastname('BetweenLife')
            ->setPassword('hashed')
            ->setRole($isAdmin ? UserRole::ROLE_ADMIN : UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildGroup(int $id, string $name = 'Elden Ring Fans'): TechGroup
    {
        $group = new TechGroup();
        $group->setName($name);
        $group->setDescription('The Lands Between');

        $idProp = new \ReflectionProperty(TechGroup::class, 'id');
        $idProp->setValue($group, $id);

        return $group;
    }

    private function buildPost(User $author, TechGroup $group, string $content = 'Let me solo her', int $id = 1): Post
    {
        $post = new Post();
        $post->setContent($content);
        $post->setAuthor($author);
        $post->setTechGroup($group);
        $post->onCreate();

        $idProp = new \ReflectionProperty(Post::class, 'id');
        $idProp->setValue($post, $id);

        return $post;
    }

    private function makeContainer(User $currentUser, bool $isAdmin = false): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($currentUser);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturnCallback(
            fn(string $attr) => match ($attr) {
                'ROLE_ADMIN' => $isAdmin,
                default      => true,
            }
        );

        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(
            fn(string $id) => in_array($id, ['security.token_storage', 'security.authorization_checker'], true)
        );
        $container->method('get')->willReturnCallback(
            fn(string $id) => match ($id) {
                'security.token_storage'         => $tokenStorage,
                'security.authorization_checker' => $authChecker,
                default => throw new \RuntimeException("Service inattendu : $id"),
            }
        );

        return $container;
    }

    private function makeController(
        User $currentUser,
        PostRepository $postRepo,
        ?TechGroupRepository $groupRepo = null,
        bool $isAdmin = false,
        ?NotificationService $notifService = null,
        ?EntityManagerInterface $em = null,
        ?TextModerationService $moderation = null,
        ?HtmlSanitizerInterface $sanitizer = null
    ): PostController {
        $controller = new PostController(
            $postRepo,
            $groupRepo      ?? $this->createMock(TechGroupRepository::class),
            new PostMapper(),
            $notifService   ?? $this->createMock(NotificationService::class),
            $em             ?? $this->createMock(EntityManagerInterface::class),
            $moderation     ?? $this->createMock(TextModerationService::class),
            $sanitizer      ?? new HtmlSanitizer((new HtmlSanitizerConfig())->allowSafeElements())
        );

        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsAllPostsWithoutPagination(): void
    {
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findAllForListingWithCounts')->willReturn([
            'posts'         => [],
            'commentCounts' => [],
            'sharedCounts'  => [],
        ]);

        $request  = new Request();
        $response = $this->makeController($tarnished, $postRepo)->list($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testListReturnsPaginatedResponse(): void
    {
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findFeedPaginatedForUser')->willReturn([
            'items'      => [],
            'totalItems' => 0,
        ]);

        $request  = new Request(query: ['page' => '1', 'limit' => '10']);
        $response = $this->makeController($tarnished, $postRepo)->list($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('items', $payload);
        $this->assertArrayHasKey('totalPages', $payload);
        $this->assertSame(1, $payload['page']);
        $this->assertSame(10, $payload['limit']);
    }

    // ======================================================================
    //  get()
    // ======================================================================

    public function testGetReturnsPost(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group, 'Grace calling...');

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findWithLikes')->with(1)->willReturn($post);

        $response = $this->makeController($tarnished, $postRepo)->get(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Grace calling...', $payload['content']);
        $this->assertSame('Tarnished', $payload['authorUsername']);
    }

    public function testGetFailsWhenPostNotFound(): void
    {
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findWithLikes')->willReturn(null);

        $response = $this->makeController($tarnished, $postRepo)->get(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  create()
    // ======================================================================

    public function testCreatePostSuccess(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('save')->willReturnCallback(function (Post $post): void {
            $post->onCreate();
            $idProp = new \ReflectionProperty(Post::class, 'id');
            $idProp->setValue($post, 1);
        });

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->with(1)->willReturn($group);

        $request = new Request(content: json_encode([
            'content' => 'Let me solo her',
            'groupId' => 1,
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo, $groupRepo)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Let me solo her', $payload['content']);
        $this->assertSame('Tarnished', $payload['authorUsername']);
    }

    public function testCreatePostReturns400WhenPayloadIsNotJsonObject(): void
    {
        $tarnished = $this->buildUser(1);
        $postRepo  = $this->createMock(PostRepository::class);

        // JSON valide mais pas un objet/tableau (string)
        $request = new Request(content: '"just a string"');
        $response = $this->makeController($tarnished, $postRepo)->create($request);

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Invalid payload', $payload['error']);
    }

    public function testCreatePostReturns400WhenContentIsWhitespaceOnly(): void
    {
        $tarnished = $this->buildUser(1);
        $postRepo  = $this->createMock(PostRepository::class);

        // Contenu = espaces → après trim devient null
        $request = new Request(content: json_encode(['content' => '   '], JSON_THROW_ON_ERROR));
        $response = $this->makeController($tarnished, $postRepo)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreatePostReturns422WhenContentRejectedByModeration(): void
    {
        $tarnished = $this->buildUser(1);
        $postRepo  = $this->createMock(PostRepository::class);
        $postRepo->expects($this->never())->method('save');

        $moderation = $this->createMock(TextModerationService::class);
        $moderation->method('checkOrThrow')->willThrowException(
            new \App\Service\Moderation\ContentRejectedException('Contenu insultant détecté.')
        );

        $request = new Request(content: json_encode(['content' => 'message offensant'], JSON_THROW_ON_ERROR));
        $response = $this->makeController($tarnished, $postRepo, null, false, null, null, $moderation)->create($request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('content_rejected', $payload['code']);
    }

    public function testCreatePostSanitizesHtmlBeforePersist(): void
    {
        // SEC-21 : le HTML dangereux est retiré avant persistance.
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('save')->willReturnCallback(function (Post $post): void {
            $post->onCreate();
            $idProp = new \ReflectionProperty(Post::class, 'id');
            $idProp->setValue($post, 1);
        });

        $request = new Request(content: json_encode([
            'content' => '<p>Coucou</p><script>alert(1)</script>',
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('Coucou', $payload['content']);
        $this->assertStringNotContainsStringIgnoringCase('<script', $payload['content']);
    }

    public function testCreatePostFailsWhenContentIsMissing(): void
    {
        $tarnished = $this->buildUser(1);
        $postRepo  = $this->createMock(PostRepository::class);

        $request = new Request(content: json_encode(['groupId' => 1], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreatePostSuccessWithoutGroup(): void
    {
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('save')->willReturnCallback(function (Post $post): void {
            $post->onCreate();
            $idProp = new \ReflectionProperty(Post::class, 'id');
            $idProp->setValue($post, 2);
        });

        $request = new Request(content: json_encode(['content' => 'Post sans groupe'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Post sans groupe', $payload['content']);
        $this->assertNull($payload['techGroupName']);
    }

    public function testCreatePostFailsWhenGroupNotFound(): void
    {
        $tarnished = $this->buildUser(1);
        $postRepo  = $this->createMock(PostRepository::class);

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->willReturn(null);

        $request = new Request(content: json_encode([
            'content' => 'Let me solo her',
            'groupId' => 99,
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo, $groupRepo)->create($request);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  delete()
    // ======================================================================

    public function testDeletePostSuccessAsAuthor(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($post);
        $postRepo->expects($this->once())->method('remove');

        $response = $this->makeController($tarnished, $postRepo)->delete(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
    }

    public function testDeletePostSuccessAsAdmin(): void
    {
        $tarnished = $this->buildUser(1, 'Tarnished', true);
        $malenia   = $this->buildUser(2, 'Malenia');
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($malenia, $group); // post de Malenia

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($post);
        $postRepo->expects($this->once())->method('remove');

        $response = $this->makeController($tarnished, $postRepo, isAdmin: true)->delete(1);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testDeletePostFailsWhenNotFound(): void
    {
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn(null);

        $response = $this->makeController($tarnished, $postRepo)->delete(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testDeletePostFailsWhenNotAuthorAndNotAdmin(): void
    {
        $tarnished = $this->buildUser(1);
        $malenia   = $this->buildUser(2, 'Malenia');
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($malenia, $group); // post de Malenia

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($post);

        $response = $this->makeController($tarnished, $postRepo, isAdmin: false)->delete(1);

        $this->assertSame(403, $response->getStatusCode());
    }

    // ======================================================================
    //  update()
    // ======================================================================

    public function testUpdatePostSuccess(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group, 'Old content');

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($post);
        $postRepo->expects($this->once())->method('save');

        $request = new Request(content: json_encode(['content' => 'Erdtree calls'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo)->update(1, $request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Erdtree calls', $payload['content']);
    }

    public function testUpdatePostFailsWhenNotFound(): void
    {
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['content' => 'test'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo)->update(99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUpdatePostFailsWhenNotAuthorAndNotAdmin(): void
    {
        $tarnished = $this->buildUser(1);
        $malenia   = $this->buildUser(2, 'Malenia');
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($malenia, $group);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($post);

        $request = new Request(content: json_encode(['content' => 'Takeover'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo, isAdmin: false)->update(1, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testUpdatePostWithNewGroupSuccess(): void
    {
        $tarnished = $this->buildUser(1);
        $group1    = $this->buildGroup(1, 'Limgrave');
        $group2    = $this->buildGroup(2, 'Farum Azula');
        $post      = $this->buildPost($tarnished, $group1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($post);
        $postRepo->expects($this->once())->method('save');

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->with(2)->willReturn($group2);

        $request = new Request(content: json_encode(['groupId' => 2], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo, $groupRepo)->update(1, $request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Farum Azula', $payload['techGroupName']);
    }

    public function testUpdatePostReturns400WhenPayloadIsNotJsonObject(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($post);

        $request = new Request(content: '"not an object"');
        $response = $this->makeController($tarnished, $postRepo)->update(1, $request);

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Invalid payload', $payload['error']);
    }

    public function testUpdatePostReturns422WhenContentRejectedByModeration(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($post);
        $postRepo->expects($this->never())->method('save');

        $moderation = $this->createMock(TextModerationService::class);
        $moderation->method('checkOrThrow')->willThrowException(
            new \App\Service\Moderation\ContentRejectedException('Contenu modifié rejeté.')
        );

        $request = new Request(content: json_encode(['content' => 'message offensant en édition'], JSON_THROW_ON_ERROR));
        $response = $this->makeController($tarnished, $postRepo, null, false, null, null, $moderation)->update(1, $request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('content_rejected', $payload['code']);
    }

    public function testUpdatePostFailsWhenNewGroupNotFound(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($post);

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['groupId' => 99], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo, $groupRepo)->update(1, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  listComments()
    // ======================================================================

    public function testListCommentsReturnsEmptyList(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($post);

        $response = $this->makeController($tarnished, $postRepo)->listComments(1, new CommentMapper());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testListCommentsFailsWhenPostNotFound(): void
    {
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn(null);

        $response = $this->makeController($tarnished, $postRepo)->listComments(99, new CommentMapper());

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  share()
    // ======================================================================

    public function testSharePostSuccessInSameGroup(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $original  = $this->buildPost($tarnished, $group, 'Original post');

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($original);
        $postRepo->method('save')->willReturnCallback(function (Post $post): void {
            $post->onCreate();
            $idProp = new \ReflectionProperty(Post::class, 'id');
            $idProp->setValue($post, 2);
        });

        $request = new Request(content: json_encode(['content' => 'Sharing this!'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo)->share(1, $request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Sharing this!', $payload['content']);
        $this->assertNotNull($payload['sharedPost']);
    }

    public function testSharePostSuccessWithCustomGroup(): void
    {
        $tarnished = $this->buildUser(1);
        $group1    = $this->buildGroup(1, 'Limgrave');
        $group2    = $this->buildGroup(2, 'Farum Azula');
        $original  = $this->buildPost($tarnished, $group1, 'Original');

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($original);
        $postRepo->method('save')->willReturnCallback(function (Post $post): void {
            $post->onCreate();
            $idProp = new \ReflectionProperty(Post::class, 'id');
            $idProp->setValue($post, 2);
        });

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->with(2)->willReturn($group2);

        $request = new Request(content: json_encode(['groupId' => 2], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo, $groupRepo)->share(1, $request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Farum Azula', $payload['techGroupName']);
    }

    public function testSharePostFailsWhenOriginalNotFound(): void
    {
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn(null);

        $request = new Request(content: json_encode([], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo)->share(99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testSharePostReturns400WhenPayloadIsNotJsonObject(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $original  = $this->buildPost($tarnished, $group, 'Original');

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($original);

        $request = new Request(content: '"just a string"');
        $response = $this->makeController($tarnished, $postRepo)->share(1, $request);

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Invalid payload', $payload['error']);
    }

    public function testSharePostFailsWhenCustomGroupNotFound(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $original  = $this->buildPost($tarnished, $group, 'Original');

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($original);

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['groupId' => 99], JSON_THROW_ON_ERROR));

        $response = $this->makeController($tarnished, $postRepo, $groupRepo)->share(1, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  like()
    // ======================================================================

    public function testLikePostSuccess(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findWithLikes')->willReturn($post);

        $likeRepo = $this->createMock(LikeRepository::class);
        $likeRepo->method('findOneBy')->willReturn(null); // pas encore liké

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');
        $em->expects($this->once())->method('refresh');

        $notifService = $this->createMock(NotificationService::class);
        $notifService->expects($this->once())->method('createAndPush');

        $response = $this->makeController($tarnished, $postRepo, notifService: $notifService, em: $em)
            ->like(1, $likeRepo);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testLikePostFailsWhenPostNotFound(): void
    {
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findWithLikes')->willReturn(null);

        $likeRepo = $this->createMock(LikeRepository::class);

        $response = $this->makeController($tarnished, $postRepo)->like(99, $likeRepo);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testLikePostFailsWhenAlreadyLiked(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findWithLikes')->willReturn($post);

        $existingLike = new \App\Entity\Like();
        $likeRepo     = $this->createMock(LikeRepository::class);
        $likeRepo->method('findOneBy')->willReturn($existingLike); // déjà liké

        $response = $this->makeController($tarnished, $postRepo)->like(1, $likeRepo);

        $this->assertSame(400, $response->getStatusCode());
    }

    // ======================================================================
    //  unlike()
    // ======================================================================

    public function testUnlikePostSuccess(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findWithLikes')->willReturn($post);

        $like     = new \App\Entity\Like();
        $likeRepo = $this->createMock(LikeRepository::class);
        $likeRepo->method('findOneBy')->willReturn($like);
        $likeRepo->expects($this->once())->method('remove');

        $response = $this->makeController($tarnished, $postRepo)->unlike(1, $likeRepo);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
    }

    public function testUnlikePostFailsWhenPostNotFound(): void
    {
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findWithLikes')->willReturn(null);

        $likeRepo = $this->createMock(LikeRepository::class);

        $response = $this->makeController($tarnished, $postRepo)->unlike(99, $likeRepo);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUnlikePostFailsWhenNotYetLiked(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('findWithLikes')->willReturn($post);

        $likeRepo = $this->createMock(LikeRepository::class);
        $likeRepo->method('findOneBy')->willReturn(null); // pas de like

        $response = $this->makeController($tarnished, $postRepo)->unlike(1, $likeRepo);

        $this->assertSame(400, $response->getStatusCode());
    }

    // ======================================================================
    //  listLikes()
    // ======================================================================

    public function testListLikesReturnsEmptyList(): void
    {
        $tarnished = $this->buildUser(1);
        $group     = $this->buildGroup(1);
        $post      = $this->buildPost($tarnished, $group);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn($post);

        $response = $this->makeController($tarnished, $postRepo)->listLikes(1, new LikeMapper());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testListLikesFailsWhenPostNotFound(): void
    {
        $tarnished = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn(null);

        $response = $this->makeController($tarnished, $postRepo)->listLikes(99, new LikeMapper());

        $this->assertSame(404, $response->getStatusCode());
    }
}
