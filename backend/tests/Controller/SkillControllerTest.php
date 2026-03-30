<?php

namespace App\Tests\Controller;

use App\Controller\SkillController;
use App\Dto\SkillResponse;
use App\Entity\User;
use App\Enum\SkillCategory;
use App\Enum\UserRole;
use App\Mapper\SkillMapper;
use App\Repository\SkillRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Bloodborne - Tests unitaires du SkillController
 *
 * GoodHunter        = utilisateur authentifié courant (Old Hunter)
 * GehrmanFirstHunter = autre utilisateur (Master of the Hunt)
 */
class SkillControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'GoodHunter'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@yharnam.hunt')
            ->setFirstname($username)
            ->setLastname('Hunter')
            ->setPassword('PalebloodMoon')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildSkillResponse(int $id, string $name, string $category = 'backend'): SkillResponse
    {
        $dto = new SkillResponse();
        $dto->id = $id;
        $dto->name = $name;
        $dto->category = $category;

        return $dto;
    }

    private function makeContainer(User $currentUser): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($currentUser);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturn(true);

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
        ?SkillRepository $repo = null,
        ?SkillMapper $mapper = null
    ): SkillController {
        $controller = new SkillController(
            $repo   ?? $this->createMock(SkillRepository::class),
            $mapper ?? $this->createMock(SkillMapper::class)
        );

        $controller->setContainer($this->makeContainer($currentUser));

        return $controller;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsAllSkills(): void
    {
        $hunter = $this->buildUser(1);
        $dto1   = $this->buildSkillResponse(1, 'PHP', 'backend');
        $dto2   = $this->buildSkillResponse(2, 'React', 'frontend');

        $repo = $this->createMock(SkillRepository::class);
        $repo->method('findAllOrderedByCategory')->willReturn([
            $this->createMock(\App\Entity\Skill::class),
            $this->createMock(\App\Entity\Skill::class),
        ]);

        $mapper = $this->createMock(SkillMapper::class);
        $mapper->method('toDto')->willReturnOnConsecutiveCalls($dto1, $dto2);

        $response = $this->makeController($hunter, $repo, $mapper)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame('PHP', $payload[0]['name']);
        $this->assertSame('React', $payload[1]['name']);
    }

    public function testListReturnsEmptyArrayWhenNoSkills(): void
    {
        $hunter = $this->buildUser(1);

        $repo = $this->createMock(SkillRepository::class);
        $repo->method('findAllOrderedByCategory')->willReturn([]);

        $response = $this->makeController($hunter, $repo)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    // ======================================================================
    //  listByCategory()
    // ======================================================================

    public function testListByCategoryReturnsSkillsForValidCategory(): void
    {
        $hunter = $this->buildUser(1);
        $dto1   = $this->buildSkillResponse(1, 'PHP', 'backend');
        $dto2   = $this->buildSkillResponse(2, 'Symfony', 'backend');

        $repo = $this->createMock(SkillRepository::class);
        $repo->method('findByCategory')
            ->with(SkillCategory::BACKEND)
            ->willReturn([
                $this->createMock(\App\Entity\Skill::class),
                $this->createMock(\App\Entity\Skill::class),
            ]);

        $mapper = $this->createMock(SkillMapper::class);
        $mapper->method('toDto')->willReturnOnConsecutiveCalls($dto1, $dto2);

        $response = $this->makeController($hunter, $repo, $mapper)->listByCategory('backend');

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame('backend', $payload[0]['category']);
    }

    public function testListByCategoryFailsForInvalidCategory(): void
    {
        $hunter = $this->buildUser(1);

        $response = $this->makeController($hunter)->listByCategory('invalid_category');

        $this->assertSame(400, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }
}
