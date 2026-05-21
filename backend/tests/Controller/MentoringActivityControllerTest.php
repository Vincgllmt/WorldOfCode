<?php

namespace App\Tests\Controller;

use App\Controller\MentoringActivityController;
use App\Entity\Follow;
use App\Entity\MentorProfile;
use App\Entity\MentoringSession;
use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Enum\SessionFormat;
use App\Enum\UserRole;
use App\Repository\FollowRepository;
use App\Repository\MentorProfileRepository;
use App\Repository\MentoringSessionRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MentoringActivityControllerTest extends TestCase
{
    private function buildUser(int $id, string $username = 'Alice'): User
    {
        $user = new User();
        $user->setUsername($username)->setEmail($username . '@woc.dev')
            ->setFirstname($username)->setLastname('Dev')
            ->setPassword('Pass!1')->setRole(UserRole::ROLE_USER);
        (new \ReflectionProperty(User::class, 'id'))->setValue($user, $id);
        $user->onCreate();
        return $user;
    }

    private function buildMentorProfile(int $id, User $user, bool $available = false): MentorProfile
    {
        $profile = new MentorProfile();
        (new \ReflectionProperty(MentorProfile::class, 'id'))->setValue($profile, $id);
        (new \ReflectionProperty(MentorProfile::class, 'user'))->setValue($profile, $user);
        $profile->setIsAvailable($available);
        $profile->onCreate();
        return $profile;
    }

    private function buildFollow(User $follower, User $followed): Follow
    {
        $follow = new Follow();
        $follow->setFollower($follower);
        $follow->setFollowed($followed);
        return $follow;
    }

    private function buildSession(int $id, MentorProfile $mentor, User $junior, ?\DateTime $createdAt = null): MentoringSession
    {
        $session = new MentoringSession();
        (new \ReflectionProperty(MentoringSession::class, 'id'))->setValue($session, $id);
        $session->setMentor($mentor)->setJunior($junior)
            ->setFormat(SessionFormat::TEXT)
            ->setStatus(MentoringSessionStatus::SCHEDULED);
        $session->onCreate();
        if ($createdAt) {
            (new \ReflectionProperty(MentoringSession::class, 'createdAt'))->setValue($session, $createdAt);
        }
        return $session;
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
        ?FollowRepository $followRepo = null,
        ?MentorProfileRepository $mentorProfileRepo = null,
        ?MentoringSessionRepository $sessionRepo = null,
    ): MentoringActivityController {
        $controller = new MentoringActivityController(
            $followRepo        ?? $this->createMock(FollowRepository::class),
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
            $sessionRepo       ?? $this->createMock(MentoringSessionRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    private function makeQueryBuilderMock(array $results = []): \Doctrine\ORM\QueryBuilder
    {
        $query = $this->createMock(\Doctrine\ORM\Query::class);
        $query->method('getResult')->willReturn($results);
        $qb = $this->createMock(\Doctrine\ORM\QueryBuilder::class);
        $qb->method('where')->willReturnSelf();
        $qb->method('andWhere')->willReturnSelf();
        $qb->method('setParameter')->willReturnSelf();
        $qb->method('orderBy')->willReturnSelf();
        $qb->method('getQuery')->willReturn($query);
        return $qb;
    }

    public function testFollowingFeedReturnsEmptyWhenNoFollows(): void
    {
        $alice = $this->buildUser(1);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->with(['follower' => $alice])->willReturn([]);

        $response = $this->makeController($alice, $followRepo)->getFollowingFeed(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload['data']);
        $this->assertSame(0, $payload['meta']['total']);
    }

    public function testFollowingFeedSkipsNonMentors(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'Bob'); // pas mentor

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([$this->buildFollow($alice, $bob)]);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->with(['user' => $bob])->willReturn(null);

        $response = $this->makeController($alice, $followRepo, $mentorProfileRepo)->getFollowingFeed(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload['data']);
    }

    public function testFollowingFeedReturnsNewSessionEvents(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'Bob');
        $profile = $this->buildMentorProfile(10, $bob);

        $session1 = $this->buildSession(100, $profile, $alice, new \DateTime('-2 days'));
        $session2 = $this->buildSession(101, $profile, $alice, new \DateTime('-1 day'));

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([$this->buildFollow($alice, $bob)]);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('createQueryBuilder')->willReturn($this->makeQueryBuilderMock([$session1, $session2]));

        $response = $this->makeController($alice, $followRepo, $mentorProfileRepo, $sessionRepo)->getFollowingFeed(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        // 2 événements new_session (Bob est disponible=false par défaut donc pas d'availability_on)
        $this->assertCount(2, $payload['data']);
        $this->assertSame('new_session', $payload['data'][0]['type']);
        // Le plus récent en premier (session2)
        $this->assertSame('Bob', $payload['data'][0]['mentor']['username']);
        $this->assertArrayNotHasKey('timestamp', $payload['data'][0]);
    }

    public function testFollowingFeedIncludesAvailabilityEvent(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'Bob');
        $profile = $this->buildMentorProfile(10, $bob, available: true);
        // updatedAt récent
        $profile->setIsAvailable(true);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([$this->buildFollow($alice, $bob)]);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('createQueryBuilder')->willReturn($this->makeQueryBuilderMock([]));

        $response = $this->makeController($alice, $followRepo, $mentorProfileRepo, $sessionRepo)->getFollowingFeed(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload['data']);
        $this->assertSame('availability_on', $payload['data'][0]['type']);
    }

    public function testFollowingFeedPaginatesResults(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'Bob');
        $profile = $this->buildMentorProfile(10, $bob);

        // 5 sessions
        $sessions = [];
        for ($i = 0; $i < 5; $i++) {
            $sessions[] = $this->buildSession(100 + $i, $profile, $alice, new \DateTime("-{$i} hours"));
        }

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([$this->buildFollow($alice, $bob)]);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('createQueryBuilder')->willReturn($this->makeQueryBuilderMock($sessions));

        $request = new Request(query: ['page' => 2, 'limit' => 2]);
        $response = $this->makeController($alice, $followRepo, $mentorProfileRepo, $sessionRepo)->getFollowingFeed($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload['data']); // page 2 avec limit 2
        $this->assertSame(5, $payload['meta']['total']);
        $this->assertSame(2, $payload['meta']['page']);
        $this->assertSame(2, $payload['meta']['limit']);
    }

    public function testFollowingFeedRespectsMaxLimit(): void
    {
        $alice = $this->buildUser(1);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([]);

        // limit > 50 → clampé à 50
        $request = new Request(query: ['limit' => 999]);
        $response = $this->makeController($alice, $followRepo)->getFollowingFeed($request);

        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(50, $payload['meta']['limit']);
    }
}
