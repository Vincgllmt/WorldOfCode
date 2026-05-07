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

class MentorStatsControllerTest extends TestCase
{
    private function buildUser(int $id, string $username = 'Bob'): User
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
        $idProp  = new \ReflectionProperty(MentorProfile::class, 'id');
        $idProp->setValue($profile, $id);
        $userProp = new \ReflectionProperty(MentorProfile::class, 'user');
        $userProp->setValue($profile, $user);
        $profile->onCreate();
        return $profile;
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
        $container->method('get')->willReturnCallback(fn(string $id) => match ($id) {
            'security.token_storage'         => $tokenStorage,
            'security.authorization_checker' => $authChecker,
            default => throw new \RuntimeException("Service inattendu : $id"),
        });
        return $container;
    }

    private function makeController(User $currentUser, ?MentorProfileRepository $mentorProfileRepo = null): MentorStatsController
    {
        $controller = new MentorStatsController(
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    // ======================================================================
    //  getStats()
    // ======================================================================

    public function testGetStatsReturns200WithStats(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);

        $expectedStats = [
            'totalSessions'   => 5,
            'activeSessions'  => 2,
            'totalMentees'    => 3,
            'averageRating'   => 4.5,
            'reliabilityRate' => 0.9,
        ];

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->with(['user' => $mentorUser])->willReturn($profile);
        $mentorProfileRepo->method('getStats')->with($profile)->willReturn($expectedStats);

        $response = $this->makeController($mentorUser, $mentorProfileRepo)->getStats();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(5, $payload['totalSessions']);
        $this->assertSame(2, $payload['activeSessions']);
        $this->assertSame(3, $payload['totalMentees']);
        $this->assertSame(4.5, $payload['averageRating']);
    }

    public function testGetStatsReturns404WhenNoProfile(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($mentorUser, $mentorProfileRepo)->getStats();

        $this->assertSame(404, $response->getStatusCode());
    }
}
