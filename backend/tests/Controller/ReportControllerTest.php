<?php

namespace App\Tests\Controller;

use App\Controller\ReportController;
use App\Dto\ReportResponse;
use App\Entity\Post;
use App\Entity\Report;
use App\Entity\TechGroup;
use App\Entity\User;
use App\Enum\UserRole;
use App\Mapper\ReportMapper;
use App\Repository\PostRepository;
use App\Repository\ReportRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Resident Evil - Tests unitaires du ReportController
 *
 * LeonKennedy = utilisateur authentifié courant (reporter)
 * AdaWong     = autre utilisateur (auteur du post signalé)
 */
class ReportControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'LeonKennedy'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@raccoon.city')
            ->setFirstname($username)
            ->setLastname('Kennedy')
            ->setPassword('RaccoonCity1998')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildPost(User $author, int $id = 1): Post
    {
        $group = new TechGroup();
        $group->setName('Raccoon Tech');

        $post = new Post();
        $post->setContent('Zombie sightings in Raccoon City.');
        $post->setAuthor($author);
        $post->setTechGroup($group);
        $post->onCreate();

        $idProp = new \ReflectionProperty(Post::class, 'id');
        $idProp->setValue($post, $id);

        return $post;
    }

    private function buildReportResponse(int $id = 1): ReportResponse
    {
        $dto = new ReportResponse();
        $dto->id = $id;
        $dto->postId = 1;
        $dto->reason = 'Spam';
        $dto->userId = 1;
        $dto->username = 'LeonKennedy';
        $dto->createdAt = '2024-01-01 12:00:00';

        return $dto;
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
        ?PostRepository $postRepo = null,
        ?ReportRepository $reportRepo = null,
        ?ReportMapper $mapper = null,
        bool $isAdmin = false
    ): ReportController {
        $controller = new ReportController(
            $postRepo   ?? $this->createMock(PostRepository::class),
            $reportRepo ?? $this->createMock(ReportRepository::class),
            $mapper     ?? $this->createMock(ReportMapper::class)
        );

        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    // ======================================================================
    //  report()
    // ======================================================================

    public function testReportPostSuccess(): void
    {
        $leon = $this->buildUser(1);
        $ada  = $this->buildUser(2, 'AdaWong');
        $post = $this->buildPost($ada);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->with(1)->willReturn($post);

        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('findOneBy')->willReturn(null);
        $reportRepo->expects($this->once())->method('save');

        $request  = new Request(content: json_encode(['reason' => 'Spam'], JSON_THROW_ON_ERROR));
        $response = $this->makeController($leon, $postRepo, $reportRepo)->report(1, $request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
    }

    public function testReportPostSuccessWithoutReason(): void
    {
        $leon = $this->buildUser(1);
        $ada  = $this->buildUser(2, 'AdaWong');
        $post = $this->buildPost($ada);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->with(1)->willReturn($post);

        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('findOneBy')->willReturn(null);
        $reportRepo->expects($this->once())->method('save');

        $request  = new Request(content: json_encode([], JSON_THROW_ON_ERROR));
        $response = $this->makeController($leon, $postRepo, $reportRepo)->report(1, $request);

        $this->assertSame(201, $response->getStatusCode());
    }

    public function testReportPostFailsWhenPostNotFound(): void
    {
        $leon = $this->buildUser(1);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->willReturn(null);

        $request  = new Request(content: json_encode([], JSON_THROW_ON_ERROR));
        $response = $this->makeController($leon, $postRepo)->report(99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testReportPostFailsWhenAlreadyReported(): void
    {
        $leon     = $this->buildUser(1);
        $ada      = $this->buildUser(2, 'AdaWong');
        $post     = $this->buildPost($ada);
        $existing = $this->createMock(Report::class);

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->method('find')->with(1)->willReturn($post);

        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('findOneBy')->willReturn($existing);

        $request  = new Request(content: json_encode([], JSON_THROW_ON_ERROR));
        $response = $this->makeController($leon, $postRepo, $reportRepo)->report(1, $request);

        $this->assertSame(400, $response->getStatusCode());
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsAllReportsForAdmin(): void
    {
        $leon = $this->buildUser(1, 'LeonKennedy');
        $dto1 = $this->buildReportResponse(1);
        $dto2 = $this->buildReportResponse(2);

        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('findAll')->willReturn([
            $this->createMock(Report::class),
            $this->createMock(Report::class),
        ]);

        $mapper = $this->createMock(ReportMapper::class);
        $mapper->method('toDto')->willReturnOnConsecutiveCalls($dto1, $dto2);

        $response = $this->makeController($leon, reportRepo: $reportRepo, mapper: $mapper, isAdmin: true)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
    }

    public function testListReturnsEmptyArrayForAdmin(): void
    {
        $leon = $this->buildUser(1);

        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('findAll')->willReturn([]);

        $response = $this->makeController($leon, reportRepo: $reportRepo, isAdmin: true)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }
}
