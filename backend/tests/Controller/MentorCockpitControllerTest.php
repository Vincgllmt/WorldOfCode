<?php

namespace App\Tests\Controller;

use App\Controller\MentorCockpitController;
use App\Entity\MentorProfile;
use App\Entity\MentoringRequest;
use App\Entity\User;
use App\Enum\MentoringRequestStatus;
use App\Enum\MentoringRequestType;
use App\Enum\UserRole;
use App\Repository\MentoringPinRepository;
use App\Repository\MentoringRequestRepository;
use App\Repository\MentorProfileRepository;
use App\Repository\MentoringSessionRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MentorCockpitControllerTest extends TestCase
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

    private function buildMentoringRequest(
        int $id,
        User $junior,
        bool $isPublic = true,
        ?MentorProfile $targetMentor = null,
        MentoringRequestStatus $status = MentoringRequestStatus::PENDING,
    ): MentoringRequest {
        $req = new MentoringRequest();
        $req->setJunior($junior)
            ->setType(MentoringRequestType::DEBUG)
            ->setTitle('Help needed')
            ->setTechStack('PHP')
            ->setDescription('I need help with this problem in my code.')
            ->setIsPublic($isPublic);
        if ($targetMentor !== null) {
            $req->setTargetMentor($targetMentor);
        }
        $req->setStatus($status);
        $idProp = new \ReflectionProperty(MentoringRequest::class, 'id');
        $idProp->setValue($req, $id);
        $req->onCreate();
        return $req;
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

    // ======================================================================
    //  getFeed()
    // ======================================================================

    public function testGetFeedReturns200WithPaginatedData(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'Junior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $req        = $this->buildMentoringRequest(5, $junior);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findPublicFeed')->willReturn([
            'data'  => [$req],
            'total' => 1,
        ]);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn(null);

        $httpRequest = new Request(['page' => 1, 'limit' => 20]);
        $response    = $this->makeController($mentorUser, $mentorProfileRepo, $requestRepo, $pinRepo)->getFeed($httpRequest);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload['data']);
        $this->assertSame(5, $payload['data'][0]['id']);
        $this->assertSame('debug', $payload['data'][0]['type']);
        $this->assertSame(1, $payload['meta']['total']);
        $this->assertSame(1, $payload['meta']['page']);
        $this->assertSame(20, $payload['meta']['limit']);
    }

    public function testGetFeedReturnsEmptyWhenNoRequests(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findPublicFeed')->willReturn(['data' => [], 'total' => 0]);

        $httpRequest = new Request();
        $response    = $this->makeController($mentorUser, $mentorProfileRepo, $requestRepo)->getFeed($httpRequest);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(0, $payload['data']);
        $this->assertSame(0, $payload['meta']['total']);
    }

    public function testGetFeedPassesTechStackFilterToRepo(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->expects($this->once())
            ->method('findPublicFeed')
            ->with(['techStack' => 'PHP'], 1, 20, $profile)
            ->willReturn(['data' => [], 'total' => 0]);

        $httpRequest = new Request(['techStack' => 'PHP']);
        $this->makeController($mentorUser, $mentorProfileRepo, $requestRepo)->getFeed($httpRequest);
    }

    // ======================================================================
    //  getRequestDetail()
    // ======================================================================

    public function testGetRequestDetailReturns200ForPublicRequest(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'Junior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $req        = $this->buildMentoringRequest(5, $junior, true);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(5)->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn(null);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->willReturn([]);

        $response = $this->makeController($mentorUser, $mentorProfileRepo, $requestRepo, $pinRepo, $sessionRepo)
            ->getRequestDetail(5);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(5, $payload['id']);
        $this->assertTrue($payload['isPublic']);
        $this->assertArrayHasKey('juniorContext', $payload);
    }

    public function testGetRequestDetailReturns200ForPrivateRequestWhenTargeted(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'Junior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $req        = $this->buildMentoringRequest(5, $junior, false, $profile);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn(null);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->willReturn([]);

        $response = $this->makeController($mentorUser, $mentorProfileRepo, $requestRepo, $pinRepo, $sessionRepo)
            ->getRequestDetail(5);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testGetRequestDetailReturns403ForPrivateRequestWhenNotTargeted(): void
    {
        $mentorUser   = $this->buildUser(1, 'MentorBob');
        $otherMentor  = $this->buildUser(3, 'OtherMentor');
        $junior       = $this->buildUser(2, 'Junior');
        $profile      = $this->buildMentorProfile(10, $mentorUser);
        $otherProfile = $this->buildMentorProfile(11, $otherMentor);
        $req          = $this->buildMentoringRequest(5, $junior, false, $otherProfile);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $response = $this->makeController($mentorUser, $mentorProfileRepo, $requestRepo)
            ->getRequestDetail(5);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testGetRequestDetailReturns404WhenNotFound(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn(null);

        $response = $this->makeController($mentorUser, $mentorProfileRepo, $requestRepo)->getRequestDetail(999);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testGetFeedTruncatesLongDescriptions(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'Junior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);

        $longDesc = str_repeat('A', 200);
        $req      = $this->buildMentoringRequest(5, $junior);
        $req->setDescription($longDesc);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findPublicFeed')->willReturn(['data' => [$req], 'total' => 1]);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($mentorUser, $mentorProfileRepo, $requestRepo, $pinRepo)
            ->getFeed(new Request());

        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringEndsWith('...', $payload['data'][0]['descriptionExcerpt']);
        $this->assertSame(153, mb_strlen($payload['data'][0]['descriptionExcerpt']));
    }
}
