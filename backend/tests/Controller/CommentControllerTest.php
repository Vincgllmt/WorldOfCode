<?php

namespace App\Tests\Controller;

use App\Controller\CommentController;
use App\Entity\Comment;
use App\Entity\Post;
use App\Entity\TechGroup;
use App\Entity\User;
use App\Enum\UserRole;
use App\Mapper\CommentMapper;
use App\Repository\CommentRepository;
use App\Repository\PostRepository;
use App\Service\NotificationService;
use App\Service\Moderation\TextModerationService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 BioShock - Tests unitaires du CommentController
 *
 * JackRyan    = utilisateur authentifié courant (auteur des commentaires)
 * AndrewRyan  = autre utilisateur (auteur des posts, contrôle d'accès)
 */
class CommentControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'JackRyan', bool $isAdmin = false): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@rapture.city')
            ->setFirstname($username)
            ->setLastname('Rapture')
            ->setPassword('WouldYouKindly')
            ->setRole($isAdmin ? UserRole::ROLE_ADMIN : UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildPost(User $author, int $id = 1): Post
    {
        $group = new TechGroup();
        $group->setName('Rapture Tech');
        $group->setDescription('A city under the sea');
        $idProp = new \ReflectionProperty(TechGroup::class, 'id');
        $idProp->setValue($group, 1);

        $post = new Post();
        $post->setContent('Would you kindly read this post?');
        $post->setAuthor($author);
        $post->setTechGroup($group);
        $post->onCreate();

        $idProp = new \ReflectionProperty(Post::class, 'id');
        $idProp->setValue($post, $id);

        return $post;
    }

    private function buildComment(User $author, Post $post, string $content = 'A man chooses, a slave obeys.', int $id = 1): Comment
    {
        $comment = new Comment();
        $comment->setContent($content);
        $comment->setAuthor($author);
        $comment->setPost($post);
        $comment->onCreate();

        $idProp = new \ReflectionProperty(Comment::class, 'id');
        $idProp->setValue($comment, $id);

        return $comment;
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
        CommentRepository $commentRepo,
        ?PostRepository $postRepo = null,
        bool $isAdmin = false,
        ?NotificationService $notifService = null,
        ?TextModerationService $moderation = null
    ): CommentController {
        $controller = new CommentController(
            $commentRepo,
            $postRepo        ?? $this->createMock(PostRepository::class),
            new CommentMapper(),
            $notifService    ?? $this->createMock(NotificationService::class),
            $moderation      ?? $this->createMock(TextModerationService::class)
        );

        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsAllComments(): void
    {
        $jack = $this->buildUser(1);
        $post = $this->buildPost($jack);
        $comment1 = $this->buildComment($jack, $post, 'Is it a lighthouse?', 1);
        $comment2 = $this->buildComment($jack, $post, 'No gods or kings, only man.', 2);

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('findAll')->willReturn([$comment1, $comment2]);

        $response = $this->makeController($jack, $commentRepo)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame('Is it a lighthouse?', $payload[0]['content']);
    }

    public function testListReturnsEmptyArrayWhenNoComments(): void
    {
        $jack = $this->buildUser(1);

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('findAll')->willReturn([]);

        $response = $this->makeController($jack, $commentRepo)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    // ======================================================================
    //  get()
    // ======================================================================

    public function testGetReturnsComment(): void
    {
        $jack    = $this->buildUser(1);
        $post    = $this->buildPost($jack);
        $comment = $this->buildComment($jack, $post, 'A man chooses, a slave obeys.');

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('find')->with(1)->willReturn($comment);

        $response = $this->makeController($jack, $commentRepo)->get(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('A man chooses, a slave obeys.', $payload['content']);
        $this->assertSame('JackRyan', $payload['authorUsername']);
    }

    public function testGetFailsWhenCommentNotFound(): void
    {
        $jack = $this->buildUser(1);

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('find')->willReturn(null);

        $response = $this->makeController($jack, $commentRepo)->get(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  create()
    // ======================================================================

    public function testCreateCommentSuccess(): void
    {
        $jack   = $this->buildUser(1);
        $andrew = $this->buildUser(2, 'AndrewRyan');
        $post   = $this->buildPost($andrew);

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('save')->willReturnCallback(function (Comment $comment): void {
            $comment->onCreate();
            $idProp = new \ReflectionProperty(Comment::class, 'id');
            $idProp->setValue($comment, 1);
        });

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->with(1)->willReturn($post);

        $notifService = $this->createMock(NotificationService::class);
        $notifService->expects($this->once())->method('createAndPush');

        $request = new Request(content: json_encode([
            'content' => 'Would you kindly leave a comment?',
            'postId'  => 1,
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($jack, $commentRepo, $postRepo, notifService: $notifService)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Would you kindly leave a comment?', $payload['content']);
        $this->assertSame('JackRyan', $payload['authorUsername']);
    }

    public function testCreateCommentFailsWhenContentIsMissing(): void
    {
        $jack = $this->buildUser(1);

        $commentRepo = $this->createMock(CommentRepository::class);

        $request = new Request(content: json_encode(['postId' => 1], JSON_THROW_ON_ERROR));

        $response = $this->makeController($jack, $commentRepo)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateCommentFailsWhenPostIdIsMissing(): void
    {
        $jack = $this->buildUser(1);

        $commentRepo = $this->createMock(CommentRepository::class);

        $request = new Request(content: json_encode(['content' => 'Rapture is falling'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($jack, $commentRepo)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateCommentReturns422WhenContentRejectedByModeration(): void
    {
        $jack = $this->buildUser(1);

        $commentRepo = $this->createMock(CommentRepository::class);
        // Le commentaire ne doit jamais être sauvegardé
        $commentRepo->expects($this->never())->method('save');

        $moderation = $this->createMock(TextModerationService::class);
        $moderation->method('checkOrThrow')->willThrowException(
            new \App\Service\Moderation\ContentRejectedException('Contenu offensant détecté.')
        );

        $request = new Request(content: json_encode([
            'content' => 'contenu insultant',
            'postId'  => 1,
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($jack, $commentRepo, null, false, null, $moderation)->create($request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('content_rejected', $payload['code']);
        $this->assertSame('Contenu offensant détecté.', $payload['error']);
    }

    public function testCreateCommentFailsWhenPostNotFound(): void
    {
        $jack = $this->buildUser(1);

        $commentRepo = $this->createMock(CommentRepository::class);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn(null);

        $request = new Request(content: json_encode([
            'content' => 'Welcome to Rapture',
            'postId'  => 99,
        ], JSON_THROW_ON_ERROR));

        $response = $this->makeController($jack, $commentRepo, $postRepo)->create($request);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  update()
    // ======================================================================

    public function testUpdateCommentSuccess(): void
    {
        $jack    = $this->buildUser(1);
        $post    = $this->buildPost($jack);
        $comment = $this->buildComment($jack, $post, 'Old content');

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('find')->willReturn($comment);
        $commentRepo->expects($this->once())->method('save');

        $request = new Request(content: json_encode(['content' => 'A lighthouse… a city… a man.'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($jack, $commentRepo)->update(1, $request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('A lighthouse… a city… a man.', $payload['content']);
    }

    public function testUpdateCommentReturns422WhenContentRejectedByModeration(): void
    {
        $jack    = $this->buildUser(1);
        $post    = $this->buildPost($jack);
        $comment = $this->buildComment($jack, $post, 'Old content');

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('find')->willReturn($comment);
        // Le commentaire ne doit pas être sauvegardé après rejet
        $commentRepo->expects($this->never())->method('save');

        $moderation = $this->createMock(TextModerationService::class);
        $moderation->method('checkOrThrow')->willThrowException(
            new \App\Service\Moderation\ContentRejectedException('Contenu modifié inacceptable.')
        );

        $request = new Request(content: json_encode(['content' => 'contenu offensant en édition'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($jack, $commentRepo, null, false, null, $moderation)->update(1, $request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('content_rejected', $payload['code']);
        // Le contenu d'origine doit être inchangé
        $this->assertSame('Old content', $comment->getContent());
    }

    public function testUpdateCommentFailsWhenCommentNotFound(): void
    {
        $jack = $this->buildUser(1);

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('find')->willReturn(null);

        $request = new Request(content: json_encode(['content' => 'test'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($jack, $commentRepo)->update(99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUpdateCommentFailsWhenNotAuthor(): void
    {
        $jack   = $this->buildUser(1);
        $andrew = $this->buildUser(2, 'AndrewRyan');
        $post   = $this->buildPost($jack);
        $comment = $this->buildComment($andrew, $post, 'Andrew\'s comment'); // commentaire d'AndrewRyan

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('find')->willReturn($comment);

        $request = new Request(content: json_encode(['content' => 'I own this now'], JSON_THROW_ON_ERROR));

        $response = $this->makeController($jack, $commentRepo)->update(1, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    // ======================================================================
    //  delete()
    // ======================================================================

    public function testDeleteCommentSuccessAsAuthor(): void
    {
        $jack    = $this->buildUser(1);
        $post    = $this->buildPost($jack);
        $comment = $this->buildComment($jack, $post);

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('find')->willReturn($comment);
        $commentRepo->expects($this->once())->method('remove');

        $response = $this->makeController($jack, $commentRepo)->delete(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
    }

    public function testDeleteCommentSuccessAsAdmin(): void
    {
        $jack   = $this->buildUser(1, 'JackRyan', true); // admin
        $andrew = $this->buildUser(2, 'AndrewRyan');
        $post   = $this->buildPost($andrew);
        $comment = $this->buildComment($andrew, $post); // commentaire d'AndrewRyan

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('find')->willReturn($comment);
        $commentRepo->expects($this->once())->method('remove');

        $response = $this->makeController($jack, $commentRepo, isAdmin: true)->delete(1);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testDeleteCommentFailsWhenCommentNotFound(): void
    {
        $jack = $this->buildUser(1);

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('find')->willReturn(null);

        $response = $this->makeController($jack, $commentRepo)->delete(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testDeleteCommentFailsWhenNotAuthorAndNotAdmin(): void
    {
        $jack    = $this->buildUser(1);
        $andrew  = $this->buildUser(2, 'AndrewRyan');
        $post    = $this->buildPost($andrew);
        $comment = $this->buildComment($andrew, $post); // commentaire d'AndrewRyan

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('find')->willReturn($comment);

        $response = $this->makeController($jack, $commentRepo, isAdmin: false)->delete(1);

        $this->assertSame(403, $response->getStatusCode());
    }
}
