<?php

namespace App\Tests\Controller;

use App\Controller\MentoringActivityController;
use App\Entity\Follow;
use App\Entity\MentorProfile;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\FollowRepository;
use App\Repository\MentorProfileRepository;
use App\Repository\MentoringSessionRepository;
use Doctrine\ORM\Query;
use Doctrine\ORM\QueryBuilder;
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
        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();
        return $user;
    }

    private function buildMentorProfile(int $id, User $user, bool $isAvailable = false): MentorProfile
    {
        $profile = new MentorProfile();
        $idProp  = new \ReflectionProperty(MentorProfile::class, 'id');
        $idProp->setValue($profile, $id);
        $userProp = new \ReflectionProperty(MentorProfile::class, 'user');
        $userProp->setValue($profile, $user);
        $profile->setIsAvailable($isAvailable);
        $profile->onCreate();
        return $profile;
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

    private function makeSessionRepoWithQueryBuilder(array $sessions): MentoringSessionRepository
    {
        $query = $this->createMock(Query::class);
        $query->method('getResult')->willReturn($sessions);

        $qb = $this->createMock(QueryBuilder::class);
        $qb->method('where')->willReturnSelf();
        $qb->method('andWhere')->willReturnSelf();
        $qb->method('setParameter')->willReturnSelf();
        $qb->method('getQuery')->willReturn($query);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('createQueryBuilder')->willReturn($qb);

        return $sessionRepo;
    }

    // ======================================================================
    //  getFollowingFeed()
    // ======================================================================

    public function testGetFollowingFeedReturnsEmptyWhenNoFollows(): void
    {
        $alice = $this->buildUser(1);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->with(['follower' => $alice])->willReturn([]);

        $response = $this->makeController($alice, $followRepo)->getFollowingFeed(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(0, $payload['data']);
        $this->assertSame(0, $payload['meta']['total']);
    }

    public function testGetFollowingFeedReturnsEmptyWhenFollowedUserHasNoMentorProfile(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'MentorBob');
        $follow     = $this->buildFollow($alice, $mentorUser);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([$follow]);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($alice, $followRepo, $mentorProfileRepo)->getFollowingFeed(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(0, $payload['data']);
    }

    public function testGetFollowingFeedReturnsSessionEventsForFollowedMentor(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'MentorBob');
        $follow     = $this->buildFollow($alice, $mentorUser);
        $profile    = $this->buildMentorProfile(10, $mentorUser, false);

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([$follow]);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $fakeSession = new class {
            public function getCreatedAt(): \DateTime { return new \DateTime('-1 day'); }
        };

        $sessionRepo = $this->makeSessionRepoWithQueryBuilder([$fakeSession]);

        $response = $this->makeController($alice, $followRepo, $mentorProfileRepo, $sessionRepo)
            ->getFollowingFeed(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload['data']);
        $this->assertSame('new_session', $payload['data'][0]['type']);
        $this->assertSame(2, $payload['data'][0]['mentor']['id']);
        $this->assertSame('MentorBob', $payload['data'][0]['mentor']['username']);
    }

    public function testGetFollowingFeedReturnsAvailabilityEventWhenMentorAvailableRecently(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'MentorBob');
        $follow     = $this->buildFollow($alice, $mentorUser);
        $profile    = $this->buildMentorProfile(10, $mentorUser, true);

        // Force updatedAt to a recent date so it passes the ">= $since" check
        $updatedAtProp = new \ReflectionProperty(MentorProfile::class, 'updatedAt');
        $updatedAtProp->setValue($profile, new \DateTime('-1 day'));

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([$follow]);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $sessionRepo = $this->makeSessionRepoWithQueryBuilder([]);

        $response = $this->makeController($alice, $followRepo, $mentorProfileRepo, $sessionRepo)
            ->getFollowingFeed(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload['data']);
        $this->assertSame('availability_on', $payload['data'][0]['type']);
    }

    public function testGetFollowingFeedRespectsPagination(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'MentorBob');
        $follow     = $this->buildFollow($alice, $mentorUser);
        $profile    = $this->buildMentorProfile(10, $mentorUser, false);

        $sessions = array_map(function (int $i) {
            return new class($i) {
                public function __construct(private int $i) {}
                public function getCreatedAt(): \DateTime { return new \DateTime("-{$this->i} hour"); }
            };
        }, range(1, 5));

        $followRepo = $this->createMock(FollowRepository::class);
        $followRepo->method('findBy')->willReturn([$follow]);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $sessionRepo = $this->makeSessionRepoWithQueryBuilder($sessions);

        $httpRequest = new Request(['page' => 1, 'limit' => 2]);
        $response    = $this->makeController($alice, $followRepo, $mentorProfileRepo, $sessionRepo)
            ->getFollowingFeed($httpRequest);

        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(5, $payload['meta']['total']);
        $this->assertCount(2, $payload['data']);
    }
}
