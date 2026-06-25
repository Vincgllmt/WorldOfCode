<?php

namespace App\Tests\Controller;

use App\Controller\AdminMentorController;
use App\Entity\MentorProfile;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\QueryBuilder;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * 🎮 Celeste — Tests unitaires AdminMentorController
 *
 * Madeline  = admin authentifiée
 * Badeline  = profil mentor (alter-ego)
 */
class AdminMentorControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildAdmin(int $id = 1, string $username = 'Madeline'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@celeste.mountain')
            ->setFirstname('Madeline')
            ->setLastname('Celeste')
            ->setPassword('StrawberryRun')
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
        ?MentorProfileRepository $repo = null,
        bool $isAdmin = true,
    ): AdminMentorController {
        $controller = new AdminMentorController(
            $repo ?? $this->createMock(MentorProfileRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    private function makeMentorProfileMock(
        int $id,
        string $username,
        string $email = '',
        bool $isAvailable = true,
        array $specialtyNames = [],
        float|null $averageRating = 4.5,
        int $totalSessions = 12,
        float|null $reliabilityRate = 90.0,
        int $maxActiveMentees = 3,
    ): MentorProfile {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn($id + 100);
        $user->method('getUsername')->willReturn($username);
        $user->method('getEmail')->willReturn($email ?: $username . '@celeste.mountain');

        $specialties = array_map(function (string $name) {
            $spec = $this->createMock(\App\Entity\TechGroup::class);
            $spec->method('getName')->willReturn($name);
            return $spec;
        }, $specialtyNames);

        $profile = $this->createMock(MentorProfile::class);
        $profile->method('getId')->willReturn($id);
        $profile->method('getUser')->willReturn($user);
        $profile->method('isAvailable')->willReturn($isAvailable);
        $profile->method('getSpecialties')->willReturn(new ArrayCollection($specialties));
        $profile->method('getAverageRating')->willReturn($averageRating);
        $profile->method('getTotalSessions')->willReturn($totalSessions);
        $profile->method('getReliabilityRate')->willReturn($reliabilityRate);
        $profile->method('getMaxActiveMentees')->willReturn($maxActiveMentees);
        $profile->method('getTeachingStyle')->willReturn(null);
        $profile->method('getMentorBio')->willReturn(null);
        $profile->method('getCreatedAt')->willReturn(new \DateTime('2024-01-01'));

        return $profile;
    }

    private function makeQueryBuilderMock(array $results = []): QueryBuilder
    {
        $query = $this->createMock(\Doctrine\ORM\Query::class);
        $query->method('getResult')->willReturn($results);

        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('innerJoin')->willReturnSelf();
        $qb->method('addSelect')->willReturnSelf();
        $qb->method('leftJoin')->willReturnSelf();
        $qb->method('andWhere')->willReturnSelf();
        $qb->method('setParameter')->willReturnSelf();
        $qb->method('orderBy')->willReturnSelf();
        $qb->method('getQuery')->willReturn($query);

        return $qb;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsAllMentors(): void
    {
        $admin   = $this->buildAdmin();
        $profile = $this->makeMentorProfileMock(1, 'Badeline', specialtyNames: ['PHP', 'Symfony']);

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('createQueryBuilder')->willReturn($this->makeQueryBuilderMock([$profile]));

        $response = $this->makeController($admin, $repo)->list(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame(1, $payload[0]['id']);
        $this->assertSame('Badeline', $payload[0]['username']);
        $this->assertSame(['PHP', 'Symfony'], $payload[0]['specialties']);
        $this->assertSame(4.5, $payload[0]['averageRating']);
        $this->assertSame(12, $payload[0]['totalSessions']);
        $this->assertTrue($payload[0]['isAvailable']);
    }

    public function testListReturnsEmptyWhenNoMentors(): void
    {
        $admin = $this->buildAdmin();

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('createQueryBuilder')->willReturn($this->makeQueryBuilderMock([]));

        $response = $this->makeController($admin, $repo)->list(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    public function testListFiltersAvailable(): void
    {
        $admin = $this->buildAdmin();

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('createQueryBuilder')->willReturn($this->makeQueryBuilderMock([]));

        $request  = new Request(['isAvailable' => 'true']);
        $response = $this->makeController($admin, $repo)->list($request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testListSearchByUsername(): void
    {
        $admin   = $this->buildAdmin();
        $profile = $this->makeMentorProfileMock(2, 'Bade');

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('createQueryBuilder')->willReturn($this->makeQueryBuilderMock([$profile]));

        $request  = new Request(['q' => 'Bade']);
        $response = $this->makeController($admin, $repo)->list($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame('Bade', $payload[0]['username']);
    }

    public function testListDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->list(new Request());
    }

    // ======================================================================
    //  detail()
    // ======================================================================

    public function testDetailReturnsProfile(): void
    {
        $admin   = $this->buildAdmin();
        $profile = $this->makeMentorProfileMock(5, 'Badeline', 'bad@celeste.mountain', true, ['PHP']);

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('find')->with(5)->willReturn($profile);
        $repo->method('getStats')->with($profile)->willReturn([
            'totalSessions'  => 20,
            'activeSessions' => 3,
            'totalMentees'   => 8,
        ]);

        $response = $this->makeController($admin, $repo)->detail(5);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(5, $payload['id']);
        $this->assertSame('Badeline', $payload['username']);
        $this->assertSame('bad@celeste.mountain', $payload['email']);
        $this->assertSame(['PHP'], $payload['specialties']);
        $this->assertSame(20, $payload['totalSessions']);
        $this->assertSame(3, $payload['activeSessions']);
        $this->assertSame(8, $payload['totalMentees']);
        $this->assertTrue($payload['isAvailable']);
    }

    public function testDetailReturns404WhenNotFound(): void
    {
        $admin = $this->buildAdmin();

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('find')->willReturn(null);

        $response = $this->makeController($admin, $repo)->detail(999);

        $this->assertSame(404, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testDetailDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->detail(1);
    }
}
