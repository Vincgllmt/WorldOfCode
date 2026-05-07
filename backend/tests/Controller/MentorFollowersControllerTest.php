<?php

namespace App\Tests\Controller;

use App\Controller\MentorFollowersController;
use App\Entity\Follow;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\FollowRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MentorFollowersControllerTest extends TestCase
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

    private function buildFollow(User $follower, User $followed): Follow
    {
        $follow = new Follow();
        $follow->setFollower($follower)->setFollowed($followed);
        return $follow;
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

    private function makeController(User $currentUser, ?FollowRepository $followRepo = null): MentorFollowersController
    {
        $controller = new MentorFollowersController(
            $followRepo ?? $this->createMock(FollowRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    // ======================================================================
    //  getFollowers()
    // ======================================================================

    public function testGetFollowersReturnsList(): void
    {
        $mentor   = $this->buildUser(1, 'MentorBob');
        $alice    = $this->buildUser(2, 'Alice');
        $charlie  = $this->buildUser(3, 'Charlie');

        $followAlice   = $this->buildFollow($alice, $mentor);
        $followCharlie = $this->buildFollow($charlie, $mentor);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->with(['followed' => $mentor])
            ->willReturn([$followAlice, $followCharlie]);

        $response = $this->makeController($mentor, $followRepo)->getFollowers();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame(2, $payload[0]['id']);
        $this->assertSame('Alice', $payload[0]['username']);
        $this->assertSame(3, $payload[1]['id']);
        $this->assertSame('Charlie', $payload[1]['username']);
    }

    public function testGetFollowersReturnsEmptyListWhenNoFollowers(): void
    {
        $mentor = $this->buildUser(1, 'MentorBob');

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->with(['followed' => $mentor])->willReturn([]);

        $response = $this->makeController($mentor, $followRepo)->getFollowers();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(0, $payload);
    }
}
