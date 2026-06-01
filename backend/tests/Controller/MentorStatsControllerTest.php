<?php

namespace App\Tests\Controller;

use App\Controller\MentorStatsController;
use App\Entity\MentorProfile;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

class MentorStatsControllerTest extends TestCase
{
    private function buildUser(int $id, string $username = 'BobMentor'): User
    {
        $user = new User();
        $user->setUsername($username)->setEmail($username . '@woc.dev')
            ->setFirstname($username)->setLastname('Dev')
            ->setPassword('Pass!1')->setRole(UserRole::ROLE_USER);
        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();
        return $user;
    }

    private function buildMentorProfile(int $id, User $user): MentorProfile
    {
        $profile = new MentorProfile();
        (new \ReflectionProperty(MentorProfile::class, 'id'))->setValue($profile, $id);
        (new \ReflectionProperty(MentorProfile::class, 'user'))->setValue($profile, $user);
        return $profile;
    }

    private function makeContainer(User $currentUser, bool $isGranted = true): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($currentUser);
        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);
        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturn($isGranted);
        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(
            fn(string $id) => in_array($id, ['security.token_storage', 'security.authorization_checker'], true)
        );
        $container->method('get')->willReturnCallback(fn(string $id) => match ($id) {
            'security.token_storage'         => $tokenStorage,
            'security.authorization_checker' => $authChecker,
            default => throw new \RuntimeException("Service inattendu : $id"),
        });
        return $container;
    }

    private function makeController(User $currentUser, ?MentorProfileRepository $repo = null, bool $isGranted = true): MentorStatsController
    {
        $controller = new MentorStatsController($repo ?? $this->createMock(MentorProfileRepository::class));
        $controller->setContainer($this->makeContainer($currentUser, $isGranted));
        return $controller;
    }

    public function testGetStatsReturnsRepositoryStats(): void
    {
        $bob = $this->buildUser(1);
        $profile = $this->buildMentorProfile(10, $bob);

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('findOneBy')->willReturn($profile);
        $repo->method('getStats')->with($profile)->willReturn([
            'sessionsCount'   => 5,
            'averageRating'   => 4.5,
            'reliabilityRate' => 0.85,
        ]);

        $response = $this->makeController($bob, $repo)->getStats();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(5, $payload['sessionsCount']);
        $this->assertSame(4.5, $payload['averageRating']);
        $this->assertSame(0.85, $payload['reliabilityRate']);
    }

    public function testGetStatsReturns404WhenProfileNotFound(): void
    {
        $bob = $this->buildUser(1);

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($bob, $repo)->getStats();

        $this->assertSame(404, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Profil mentor non trouvé.', $payload['error']);
    }

    public function testGetStatsDeniesNonMentor(): void
    {
        $bob = $this->buildUser(1);

        $this->expectException(AccessDeniedException::class);
        $this->makeController($bob, isGranted: false)->getStats();
    }
}
