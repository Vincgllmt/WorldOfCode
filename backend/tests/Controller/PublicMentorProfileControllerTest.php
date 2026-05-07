<?php

namespace App\Tests\Controller;

use App\Controller\PublicMentorProfileController;
use App\Entity\MentorProfile;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use App\Repository\UserRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class PublicMentorProfileControllerTest extends TestCase
{
    private function buildUser(int $id, string $username = 'Alice'): User
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

    private function makeController(
        User $currentUser,
        ?UserRepository $userRepo = null,
        ?MentorProfileRepository $mentorProfileRepo = null,
    ): PublicMentorProfileController {
        $controller = new PublicMentorProfileController(
            $userRepo          ?? $this->createMock(UserRepository::class),
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    // ======================================================================
    //  getPublicProfile()
    // ======================================================================

    public function testGetPublicProfileReturns200(): void
    {
        $viewer     = $this->buildUser(1, 'Viewer');
        $mentorUser = $this->buildUser(2, 'MentorBob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($mentorUser);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->with(['user' => $mentorUser])->willReturn($profile);

        $response = $this->makeController($viewer, $userRepo, $mentorProfileRepo)->getPublicProfile(2);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(10, $payload['id']);
        $this->assertFalse($payload['isAvailable']);
        $this->assertArrayHasKey('specialties', $payload);
        $this->assertArrayHasKey('averageRating', $payload);
        $this->assertArrayHasKey('totalSessions', $payload);
    }

    public function testGetPublicProfileReturns404WhenUserNotFound(): void
    {
        $viewer = $this->buildUser(1, 'Viewer');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->willReturn(null);

        $response = $this->makeController($viewer, $userRepo)->getPublicProfile(999);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testGetPublicProfileReturns404WhenNoMentorProfile(): void
    {
        $viewer     = $this->buildUser(1, 'Viewer');
        $normalUser = $this->buildUser(2, 'NormalUser');

        $userRepo = $this->createMock(UserRepository::class);
        $userRepo->method('find')->with(2)->willReturn($normalUser);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($viewer, $userRepo, $mentorProfileRepo)->getPublicProfile(2);

        $this->assertSame(404, $response->getStatusCode());
    }
}
