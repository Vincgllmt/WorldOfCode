<?php

namespace App\Tests\Controller;

use App\Controller\AdminGroupController;
use App\Entity\TechGroup;
use App\Entity\TechWatchSource;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\TechGroupRepository;
use App\Repository\TechWatchSourceRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * 🎮 Hades — Tests unitaires AdminGroupController
 *
 * Zagreus  = admin authentifié (fils du dieu des enfers)
 * Nyx      = autre entité référencée
 */
class AdminGroupControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildAdmin(int $id = 1, string $username = 'Zagreus'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@underworld.gr')
            ->setFirstname('Zagreus')
            ->setLastname('SonOfHades')
            ->setPassword('StygianBlade')
            ->setRole(UserRole::ROLE_ADMIN);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function makeContainer(User $currentUser, bool $isAdmin = true): ContainerInterface
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
        ?TechGroupRepository $groupRepo = null,
        ?TechWatchSourceRepository $watchRepo = null,
        ?EntityManagerInterface $em = null,
        bool $isAdmin = true,
    ): AdminGroupController {
        $controller = new AdminGroupController(
            $groupRepo ?? $this->createMock(TechGroupRepository::class),
            $watchRepo ?? $this->createMock(TechWatchSourceRepository::class),
            $em        ?? $this->createMock(EntityManagerInterface::class),
        );
        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    private function buildGroup(int $id, string $name = 'ElysiFields'): TechGroup
    {
        $group = new TechGroup();
        $group->setName($name);

        $idProp = new \ReflectionProperty(TechGroup::class, 'id');
        $idProp->setValue($group, $id);

        return $group;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsGroups(): void
    {
        $admin     = $this->buildAdmin();
        $groupRepo = $this->createMock(TechGroupRepository::class);
        $watchRepo = $this->createMock(TechWatchSourceRepository::class);
        $group     = $this->buildGroup(1, 'ElysiFields');

        $groupRepo->method('findPaginatedWithCounts')->willReturn([
            'items' => [[
                'id'             => 1,
                'name'           => 'ElysiFields',
                'description'    => 'Fields of Elysium',
                'memberCount'    => 10,
                'postCount'      => 5,
                'creatorUsername'=> 'Zagreus',
                'createdAt'      => new \DateTime('2024-01-01'),
                'rssFeedUrl'     => null,
            ]],
            'total' => 1,
        ]);

        $response = $this->makeController($admin, $groupRepo, $watchRepo)->list(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(1, $payload['total']);
        $this->assertCount(1, $payload['items']);
        $this->assertSame('ElysiFields', $payload['items'][0]['name']);
        $this->assertSame(10, $payload['items'][0]['memberCount']);
    }

    public function testListDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->list(new Request());
    }

    // ======================================================================
    //  create()
    // ======================================================================

    public function testCreateSucceeds(): void
    {
        $admin = $this->buildAdmin();
        $em    = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $entity) {
            if ($entity instanceof TechGroup) {
                $idProp = new \ReflectionProperty(TechGroup::class, 'id');
                $idProp->setValue($entity, 1);
            }
        });
        $em->expects($this->once())->method('flush');

        $request  = new Request(content: json_encode(['name' => 'Tartarus', 'description' => 'The deep abyss']));
        $response = $this->makeController($admin, em: $em)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Tartarus', $payload['name']);
    }

    public function testCreateWithRssFeedUrl(): void
    {
        $admin = $this->buildAdmin();
        $em    = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $entity) {
            if ($entity instanceof TechGroup) {
                $idProp = new \ReflectionProperty(TechGroup::class, 'id');
                $idProp->setValue($entity, 1);
            }
        });
        $em->expects($this->once())->method('flush');

        $request  = new Request(content: json_encode([
            'name'       => 'Olympus',
            'rssFeedUrl' => 'https://olympus.gr/feed.xml',
        ]));
        $response = $this->makeController($admin, em: $em)->create($request);

        $this->assertSame(201, $response->getStatusCode());
    }

    public function testCreateReturns400WhenNameTooShort(): void
    {
        $admin    = $this->buildAdmin();
        $request  = new Request(content: json_encode(['name' => 'X']));
        $response = $this->makeController($admin)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateReturns422WhenInvalidRssUrl(): void
    {
        $admin    = $this->buildAdmin();
        $request  = new Request(content: json_encode(['name' => 'Olympus', 'rssFeedUrl' => 'not-a-url']));
        $response = $this->makeController($admin)->create($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testCreateDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->create(new Request());
    }

    // ======================================================================
    //  update()
    // ======================================================================

    public function testUpdateSucceeds(): void
    {
        $admin     = $this->buildAdmin();
        $group     = $this->buildGroup(3, 'OldName');
        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->with(3)->willReturn($group);
        $watchRepo = $this->createMock(TechWatchSourceRepository::class);
        $watchRepo->method('findOneBy')->willReturn(null);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $request  = new Request(content: json_encode(['name' => 'NewName']));
        $response = $this->makeController($admin, $groupRepo, $watchRepo, $em)->update(3, $request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('NewName', $group->getName());
    }

    public function testUpdateReturns404WhenGroupNotFound(): void
    {
        $admin     = $this->buildAdmin();
        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->willReturn(null);

        $request  = new Request(content: json_encode(['name' => 'Test']));
        $response = $this->makeController($admin, $groupRepo)->update(999, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUpdateReturns400WhenNameTooShort(): void
    {
        $admin     = $this->buildAdmin();
        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->willReturn($this->buildGroup(1));

        $request  = new Request(content: json_encode(['name' => 'X']));
        $response = $this->makeController($admin, $groupRepo)->update(1, $request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testUpdateReturns422WhenInvalidRssUrl(): void
    {
        $admin     = $this->buildAdmin();
        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->willReturn($this->buildGroup(1));

        $request  = new Request(content: json_encode(['name' => 'ValidName', 'rssFeedUrl' => 'bad-url']));
        $response = $this->makeController($admin, $groupRepo)->update(1, $request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testUpdateRemovesRssWhenSetToEmpty(): void
    {
        $admin     = $this->buildAdmin();
        $group     = $this->buildGroup(3, 'ElysiFields');
        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->willReturn($group);

        $source    = new TechWatchSource();
        $source->setFeedUrl('https://old.com/feed.xml')->setName('old')->setTechGroup($group);
        $watchRepo = $this->createMock(TechWatchSourceRepository::class);
        $watchRepo->method('findOneBy')->willReturn($source);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('remove')->with($source);
        $em->expects($this->once())->method('flush');

        $request  = new Request(content: json_encode(['name' => 'ElysiFields', 'rssFeedUrl' => '']));
        $response = $this->makeController($admin, $groupRepo, $watchRepo, $em)->update(3, $request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testUpdateDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->update(1, new Request());
    }

    // ======================================================================
    //  delete()
    // ======================================================================

    public function testDeleteSucceeds(): void
    {
        $admin     = $this->buildAdmin();
        $group     = $this->buildGroup(5);
        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->with(5)->willReturn($group);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('remove')->with($group);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($admin, $groupRepo, em: $em)->delete(5);

        $this->assertSame(204, $response->getStatusCode());
    }

    public function testDeleteReturns404WhenNotFound(): void
    {
        $admin     = $this->buildAdmin();
        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('find')->willReturn(null);

        $response = $this->makeController($admin, $groupRepo)->delete(999);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testDeleteDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->delete(1);
    }
}
