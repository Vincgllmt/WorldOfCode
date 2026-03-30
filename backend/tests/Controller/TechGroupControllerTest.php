<?php

namespace App\Tests\Controller;

use App\Controller\TechGroupController;
use App\Dto\PostResponse;
use App\Dto\TechGroupResponse;
use App\Dto\UserResponse;
use App\Entity\TechGroup;
use App\Entity\User;
use App\Enum\UserRole;
use App\Mapper\PostMapper;
use App\Mapper\TechGroupMapper;
use App\Mapper\UserMapper;
use App\Repository\TechGroupRepository;
use App\Service\TechGroupMembershipService;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityNotFoundException;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Hotline Miami - Tests unitaires du TechGroupController
 *
 * Jacket = utilisateur authentifié courant (admin / membre)
 * Biker  = autre utilisateur (membre du groupe)
 */
class TechGroupControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'Jacket'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@miami.50')
            ->setFirstname($username)
            ->setLastname('50Blades')
            ->setPassword('LetTheBodiesHitTheFloor')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildTechGroupResponse(int $id = 1, string $name = 'Miami Dev'): TechGroupResponse
    {
        $dto = new TechGroupResponse();
        $dto->id = $id;
        $dto->name = $name;
        $dto->description = 'A city of developers';
        $dto->creatorId = 1;
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
        ?TechGroupRepository $repo = null,
        ?TechGroupMapper $mapper = null,
        ?UserMapper $userMapper = null,
        ?PostMapper $postMapper = null,
        ?TechGroupMembershipService $membershipService = null,
        bool $isAdmin = false
    ): TechGroupController {
        $controller = new TechGroupController(
            $repo             ?? $this->createMock(TechGroupRepository::class),
            $mapper           ?? $this->createMock(TechGroupMapper::class),
            $userMapper       ?? $this->createMock(UserMapper::class),
            $postMapper       ?? $this->createMock(PostMapper::class),
            $membershipService ?? $this->createMock(TechGroupMembershipService::class)
        );

        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsAllGroups(): void
    {
        $jacket = $this->buildUser(1);
        $dto1   = $this->buildTechGroupResponse(1, 'Miami Dev');
        $dto2   = $this->buildTechGroupResponse(2, 'Hotline Backend');

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('findAll')->willReturn([
            $this->createMock(TechGroup::class),
            $this->createMock(TechGroup::class),
        ]);

        $mapper = $this->createMock(TechGroupMapper::class);
        $mapper->method('toDto')->willReturnOnConsecutiveCalls($dto1, $dto2);

        $response = $this->makeController($jacket, $repo, $mapper)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame('Miami Dev', $payload[0]['name']);
    }

    // ======================================================================
    //  get()
    // ======================================================================

    public function testGetReturnsGroup(): void
    {
        $jacket = $this->buildUser(1);
        $dto    = $this->buildTechGroupResponse(1);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->with(1)->willReturn($this->createMock(TechGroup::class));

        $mapper = $this->createMock(TechGroupMapper::class);
        $mapper->method('toDto')->willReturn($dto);

        $response = $this->makeController($jacket, $repo, $mapper)->get(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Miami Dev', $payload['name']);
    }

    public function testGetFailsWhenGroupNotFound(): void
    {
        $jacket = $this->buildUser(1);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($jacket, $repo)->get(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  create()
    // ======================================================================

    public function testCreateGroupSuccessAsAdmin(): void
    {
        $jacket = $this->buildUser(1);
        $dto    = $this->buildTechGroupResponse(1, 'New Group');

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('findByNameInsensitive')->willReturn(null);
        $repo->expects($this->once())->method('save');

        $mapper = $this->createMock(TechGroupMapper::class);
        $mapper->method('toDto')->willReturn($dto);

        $request  = new Request(content: json_encode(['name' => 'New Group'], JSON_THROW_ON_ERROR));
        $response = $this->makeController($jacket, $repo, $mapper, isAdmin: true)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('New Group', $payload['name']);
    }

    public function testCreateGroupFailsWhenNameIsMissing(): void
    {
        $jacket  = $this->buildUser(1);
        $request = new Request(content: json_encode([], JSON_THROW_ON_ERROR));

        $response = $this->makeController($jacket, isAdmin: true)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateGroupFailsWhenNameAlreadyExists(): void
    {
        $jacket = $this->buildUser(1);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('findByNameInsensitive')->willReturn($this->createMock(TechGroup::class));

        $request  = new Request(content: json_encode(['name' => 'Miami Dev'], JSON_THROW_ON_ERROR));
        $response = $this->makeController($jacket, $repo, isAdmin: true)->create($request);

        $this->assertSame(409, $response->getStatusCode());
    }

    // ======================================================================
    //  update()
    // ======================================================================

    public function testUpdateGroupSuccessAsAdmin(): void
    {
        $jacket = $this->buildUser(1);
        $group  = $this->createMock(TechGroup::class);
        $group->method('getName')->willReturn('Miami Dev');
        $group->method('getDescription')->willReturn('Old desc');
        $dto    = $this->buildTechGroupResponse(1, 'Updated Group');

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->with(1)->willReturn($group);
        $repo->expects($this->once())->method('save');

        $mapper = $this->createMock(TechGroupMapper::class);
        $mapper->method('toDto')->willReturn($dto);

        $request  = new Request(content: json_encode(['name' => 'Updated Group'], JSON_THROW_ON_ERROR));
        $response = $this->makeController($jacket, $repo, $mapper, isAdmin: true)->update(1, $request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testUpdateGroupFailsWhenGroupNotFound(): void
    {
        $jacket = $this->buildUser(1);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->willReturn(null);

        $request  = new Request(content: json_encode(['name' => 'X'], JSON_THROW_ON_ERROR));
        $response = $this->makeController($jacket, $repo, isAdmin: true)->update(99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  delete()
    // ======================================================================

    public function testDeleteGroupSuccessAsAdmin(): void
    {
        $jacket = $this->buildUser(1);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->with(1)->willReturn($this->createMock(TechGroup::class));
        $repo->expects($this->once())->method('remove');

        $response = $this->makeController($jacket, $repo, isAdmin: true)->delete(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
    }

    public function testDeleteGroupFailsWhenGroupNotFound(): void
    {
        $jacket = $this->buildUser(1);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($jacket, $repo, isAdmin: true)->delete(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  listUsers()
    // ======================================================================

    public function testListUsersReturnsMembers(): void
    {
        $jacket = $this->buildUser(1);
        $biker  = $this->buildUser(2, 'Biker');

        $group = $this->createMock(TechGroup::class);
        $group->method('getUsers')->willReturn(new ArrayCollection([$biker]));

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->with(1)->willReturn($group);

        $userDto = new UserResponse();
        $userDto->id = 2;
        $userDto->username = 'Biker';

        $userMapper = $this->createMock(UserMapper::class);
        $userMapper->method('toDto')->willReturn($userDto);

        $response = $this->makeController($jacket, $repo, userMapper: $userMapper)->listUsers(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame('Biker', $payload[0]['username']);
    }

    public function testListUsersFailsWhenGroupNotFound(): void
    {
        $jacket = $this->buildUser(1);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($jacket, $repo)->listUsers(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  joinGroup()
    // ======================================================================

    public function testJoinGroupSuccess(): void
    {
        $jacket = $this->buildUser(1);

        $membershipService = $this->createMock(TechGroupMembershipService::class);
        $membershipService->method('join')->with(1, $jacket)->willReturn(true);

        $response = $this->makeController($jacket, membershipService: $membershipService)->joinGroup(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('joined', $payload['message']);
    }

    public function testJoinGroupWhenAlreadyMember(): void
    {
        $jacket = $this->buildUser(1);

        $membershipService = $this->createMock(TechGroupMembershipService::class);
        $membershipService->method('join')->with(1, $jacket)->willReturn(false);

        $response = $this->makeController($jacket, membershipService: $membershipService)->joinGroup(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('Already', $payload['message']);
    }

    public function testJoinGroupFailsWhenGroupNotFound(): void
    {
        $jacket = $this->buildUser(1);

        $membershipService = $this->createMock(TechGroupMembershipService::class);
        $membershipService->method('join')->willThrowException(new EntityNotFoundException());

        $response = $this->makeController($jacket, membershipService: $membershipService)->joinGroup(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  leaveGroup()
    // ======================================================================

    public function testLeaveGroupSuccess(): void
    {
        $jacket = $this->buildUser(1);

        $membershipService = $this->createMock(TechGroupMembershipService::class);
        $membershipService->method('leave')->with(1, $jacket)->willReturn(true);

        $response = $this->makeController($jacket, membershipService: $membershipService)->leaveGroup(1);

        $this->assertSame(204, $response->getStatusCode());
    }

    public function testLeaveGroupFailsWhenGroupNotFound(): void
    {
        $jacket = $this->buildUser(1);

        $membershipService = $this->createMock(TechGroupMembershipService::class);
        $membershipService->method('leave')->willThrowException(new EntityNotFoundException());

        $response = $this->makeController($jacket, membershipService: $membershipService)->leaveGroup(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  getGroupPosts()
    // ======================================================================

    public function testGetGroupPostsReturnsPosts(): void
    {
        $jacket = $this->buildUser(1);

        $postDto = new PostResponse();
        $postDto->id = 1;
        $postDto->content = 'First blood in Miami.';

        $group = $this->createMock(TechGroup::class);
        $group->method('getPosts')->willReturn(new ArrayCollection([
            $this->createMock(\App\Entity\Post::class),
        ]));

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->with(1)->willReturn($group);

        $postMapper = $this->createMock(PostMapper::class);
        $postMapper->method('toDto')->willReturn($postDto);

        $response = $this->makeController($jacket, $repo, postMapper: $postMapper)->getGroupPosts(1);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame('First blood in Miami.', $payload[0]['content']);
    }

    public function testGetGroupPostsFailsWhenGroupNotFound(): void
    {
        $jacket = $this->buildUser(1);

        $repo = $this->createMock(TechGroupRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($jacket, $repo)->getGroupPosts(99);

        $this->assertSame(404, $response->getStatusCode());
    }
}
