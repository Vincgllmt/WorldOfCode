<?php

namespace App\Tests\Controller;

use App\Controller\MentorCockpitController;
use App\Entity\MentorProfile;
use App\Entity\MentoringPin;
use App\Entity\MentoringRequest;
use App\Entity\MentoringSession;
use App\Entity\User;
use App\Enum\MentoringRequestType;
use App\Enum\MentoringSessionStatus;
use App\Enum\SessionFormat;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use App\Repository\MentoringPinRepository;
use App\Repository\MentoringRequestRepository;
use App\Repository\MentoringSessionRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MentorCockpitControllerTest extends TestCase
{
    private function buildUser(int $id, string $username = 'BobMentor'): User
    {
        $user = new User();
        $user->setUsername($username)->setEmail($username . '@woc.dev')
            ->setFirstname($username)->setLastname('Dev')
            ->setPassword('Pass!1')->setRole(UserRole::ROLE_USER);
        (new \ReflectionProperty(User::class, 'id'))->setValue($user, $id);
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

    private function buildRequest(
        int $id,
        User $junior,
        string $title = 'Need help',
        string $description = 'Description courte',
        bool $isPublic = true,
        ?MentorProfile $target = null,
    ): MentoringRequest {
        $req = new MentoringRequest();
        $req->setJunior($junior)
            ->setType(MentoringRequestType::DEBUG)
            ->setTitle($title)
            ->setTechStack('PHP')
            ->setDescription($description)
            ->setBlockedSince('depuis 2 jours')
            ->setAlreadyTried('retry')
            ->setExpectedBehavior('no error')
            ->setObservedBehavior('500 error')
            ->setIsPublic($isPublic);
        if ($target) {
            $req->setTargetMentor($target);
        }
        $req->onCreate();
        (new \ReflectionProperty(MentoringRequest::class, 'id'))->setValue($req, $id);
        return $req;
    }

    private function buildSession(int $id, MentorProfile $mentor, User $junior): MentoringSession
    {
        $s = new MentoringSession();
        (new \ReflectionProperty(MentoringSession::class, 'id'))->setValue($s, $id);
        $s->setMentor($mentor)->setJunior($junior)
            ->setFormat(SessionFormat::TEXT)
            ->setStatus(MentoringSessionStatus::COMPLETED);
        $s->onCreate();
        return $s;
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
        ?MentorProfileRepository $mentorProfileRepo = null,
        ?MentoringRequestRepository $requestRepo = null,
        ?MentoringPinRepository $pinRepo = null,
        ?MentoringSessionRepository $sessionRepo = null,
    ): MentorCockpitController {
        $controller = new MentorCockpitController(
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
            $requestRepo       ?? $this->createMock(MentoringRequestRepository::class),
            $pinRepo           ?? $this->createMock(MentoringPinRepository::class),
            $sessionRepo       ?? $this->createMock(MentoringSessionRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    // ── getFeed() ───────────────────────────────────────────

    public function testGetFeedReturnsPaginatedRequests(): void
    {
        $alice  = $this->buildUser(1, 'Alice');
        $bob    = $this->buildUser(2, 'Bob');
        $profile = $this->buildMentorProfile(10, $bob);
        $req1 = $this->buildRequest(100, $alice, 'Titre 1');
        $req2 = $this->buildRequest(101, $alice, 'Titre 2');

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findPublicFeed')->willReturn([
            'data' => [$req1, $req2],
            'total' => 2,
        ]);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($bob, $mentorRepo, $requestRepo, $pinRepo)->getFeed(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload['data']);
        $this->assertSame(100, $payload['data'][0]['id']);
        $this->assertSame('Titre 1', $payload['data'][0]['title']);
        $this->assertSame(2, $payload['meta']['total']);
        $this->assertNull($payload['data'][0]['pin']);
    }

    public function testGetFeedFiltersByTechStack(): void
    {
        $alice  = $this->buildUser(1, 'Alice');
        $bob    = $this->buildUser(2, 'Bob');
        $profile = $this->buildMentorProfile(10, $bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->expects($this->once())->method('findPublicFeed')
            ->with(['techStack' => 'JavaScript'], 1, 20, $profile)
            ->willReturn(['data' => [], 'total' => 0]);

        $request = new Request(query: ['techStack' => 'JavaScript']);
        $response = $this->makeController($bob, $mentorRepo, $requestRepo)->getFeed($request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testGetFeedClampsLimitTo50(): void
    {
        $bob = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->expects($this->once())->method('findPublicFeed')
            ->with([], 1, 50, $profile)
            ->willReturn(['data' => [], 'total' => 0]);

        $request = new Request(query: ['limit' => 999]);
        $response = $this->makeController($bob, $mentorRepo, $requestRepo)->getFeed($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(50, $payload['meta']['limit']);
    }

    public function testGetFeedIncludesPinInfoWhenMentorHasActivePin(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $bob);
        $req     = $this->buildRequest(100, $alice);

        $pin = new MentoringPin();
        $pin->setMentor($profile)->setRequest($req)->setIsActive(true);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findPublicFeed')->willReturn(['data' => [$req], 'total' => 1]);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn($pin);

        $response = $this->makeController($bob, $mentorRepo, $requestRepo, $pinRepo)->getFeed(new Request());

        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertNotNull($payload['data'][0]['pin']);
        $this->assertTrue($payload['data'][0]['pin']['isActive']);
        $this->assertNotEmpty($payload['data'][0]['pin']['expiresAt']);
    }

    public function testGetFeedTruncatesLongDescription(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $bob);

        // Description > 150 chars
        $longDesc = str_repeat('a', 200);
        $req = $this->buildRequest(100, $alice, description: $longDesc);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findPublicFeed')->willReturn(['data' => [$req], 'total' => 1]);

        $response = $this->makeController($bob, $mentorRepo, $requestRepo)->getFeed(new Request());

        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringEndsWith('...', $payload['data'][0]['descriptionExcerpt']);
        $this->assertSame(153, mb_strlen($payload['data'][0]['descriptionExcerpt']));
    }

    // ── getRequestDetail() ────────────────────────────────────

    public function testGetRequestDetailReturnsFullPayloadIncludingHistory(): void
    {
        $alice = $this->buildUser(1, 'Alice');
        $bob   = $this->buildUser(2, 'Bob');
        $profile = $this->buildMentorProfile(10, $bob);
        $req     = $this->buildRequest(100, $alice);

        // Sessions précédentes mentor↔junior
        $past1 = $this->buildSession(900, $profile, $alice);
        $past1->setCompletedAt(new \DateTime('-1 month'));

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->willReturn([$past1]);

        $response = $this->makeController($bob, $mentorRepo, $requestRepo, null, $sessionRepo)->getRequestDetail(100);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(100, $payload['id']);
        $this->assertSame('Description courte', $payload['description']);
        $this->assertSame('depuis 2 jours', $payload['blockedSince']);
        $this->assertSame('retry', $payload['alreadyTried']);
        $this->assertSame('no error', $payload['expectedBehavior']);
        $this->assertSame('500 error', $payload['observedBehavior']);
        $this->assertSame('Alice', $payload['juniorContext']['username']);
        $this->assertCount(1, $payload['juniorContext']['previousSessions']);
        $this->assertSame(900, $payload['juniorContext']['previousSessions'][0]['id']);
    }

    public function testGetRequestDetailReturns404WhenNotFound(): void
    {
        $bob = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $bob);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn(null);

        $response = $this->makeController($bob, $mentorRepo, $requestRepo)->getRequestDetail(999);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testGetRequestDetailReturns403WhenPrivateRequestTargetsAnotherMentor(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'Bob');
        $carol = $this->buildUser(3, 'Carol');
        $bobProfile   = $this->buildMentorProfile(10, $bob);
        $carolProfile = $this->buildMentorProfile(11, $carol);

        // Demande privée ciblée sur Carol
        $req = $this->buildRequest(100, $alice, isPublic: false, target: $carolProfile);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($bobProfile); // Bob essaie

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $response = $this->makeController($bob, $mentorRepo, $requestRepo)->getRequestDetail(100);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testGetRequestDetailReturns403WhenPrivateRequestHasNoTarget(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $bob);

        $req = $this->buildRequest(100, $alice, isPublic: false);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $response = $this->makeController($bob, $mentorRepo, $requestRepo)->getRequestDetail(100);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testGetRequestDetailAllowsTargetedMentorOnPrivateRequest(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $bob);

        // Demande privée ciblée précisément sur Bob
        $req = $this->buildRequest(100, $alice, isPublic: false, target: $profile);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->willReturn([]);

        $response = $this->makeController($bob, $mentorRepo, $requestRepo, null, $sessionRepo)->getRequestDetail(100);

        $this->assertSame(200, $response->getStatusCode());
    }
}
