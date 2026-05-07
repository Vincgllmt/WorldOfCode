<?php

namespace App\Tests\Controller;

use App\Controller\MentoringPinController;
use App\Entity\MentorProfile;
use App\Entity\MentoringPin;
use App\Entity\MentoringRequest;
use App\Entity\User;
use App\Enum\MentoringRequestStatus;
use App\Enum\MentoringRequestType;
use App\Enum\UserRole;
use App\Repository\MentoringPinRepository;
use App\Repository\MentoringRequestRepository;
use App\Repository\MentorProfileRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MentoringPinControllerTest extends TestCase
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

    private function buildRequest(int $id, User $junior, bool $isPublic = true, ?MentorProfile $targetMentor = null): MentoringRequest
    {
        $req = new MentoringRequest();
        $req->setJunior($junior)
            ->setType(MentoringRequestType::DEBUG)
            ->setTitle('Test request')
            ->setTechStack('PHP')
            ->setDescription('I need help with X')
            ->setIsPublic($isPublic);
        if ($targetMentor !== null) {
            $req->setTargetMentor($targetMentor);
        }
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
        ?MentoringRequestRepository $requestRepo = null,
        ?MentoringPinRepository $pinRepo = null,
        ?MentorProfileRepository $mentorProfileRepo = null,
        ?EntityManagerInterface $em = null,
    ): MentoringPinController {
        $controller = new MentoringPinController(
            $requestRepo      ?? $this->createMock(MentoringRequestRepository::class),
            $pinRepo          ?? $this->createMock(MentoringPinRepository::class),
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
            $em               ?? $this->createMock(EntityManagerInterface::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    // ======================================================================
    //  pin()
    // ======================================================================

    public function testPinReturns201WhenSuccessful(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'Junior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $req        = $this->buildRequest(5, $junior, true);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(5)->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn(null);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('persist');
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($mentorUser, $requestRepo, $pinRepo, $mentorProfileRepo, $em)->pin(5);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['isActive']);
        $this->assertArrayHasKey('expiresAt', $payload);
    }

    public function testPinReturns404WhenRequestNotFound(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn(null);

        $response = $this->makeController($mentorUser, $requestRepo, mentorProfileRepo: $mentorProfileRepo)->pin(999);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testPinReturns404WhenRequestIsTerminal(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'Junior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $req        = $this->buildRequest(5, $junior);
        $req->setStatus(MentoringRequestStatus::ACCEPTED);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $response = $this->makeController($mentorUser, $requestRepo, mentorProfileRepo: $mentorProfileRepo)->pin(5);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testPinReturns403WhenPrivateRequestNotTargeted(): void
    {
        $mentorUser   = $this->buildUser(1, 'MentorBob');
        $otherMentor  = $this->buildUser(3, 'OtherMentor');
        $junior       = $this->buildUser(2, 'Junior');
        $profile      = $this->buildMentorProfile(10, $mentorUser);
        $otherProfile = $this->buildMentorProfile(11, $otherMentor);
        $req          = $this->buildRequest(5, $junior, false, $otherProfile);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $response = $this->makeController($mentorUser, $requestRepo, mentorProfileRepo: $mentorProfileRepo)->pin(5);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testPinReturns409WhenAlreadyPinnedByAnother(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'Junior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $req        = $this->buildRequest(5, $junior);

        $existingPin = new MentoringPin();
        $existingPin->setMentor($profile)->setRequest($req);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')
            ->willReturnCallback(fn(array $criteria) => isset($criteria['request']) ? $existingPin : null);

        $response = $this->makeController($mentorUser, $requestRepo, $pinRepo, $mentorProfileRepo)->pin(5);

        $this->assertSame(409, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('REQUEST_ALREADY_PINNED', $payload['code']);
    }

    // ======================================================================
    //  unpin()
    // ======================================================================

    public function testUnpinReturns200WhenSuccessful(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'Junior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $req        = $this->buildRequest(5, $junior);
        $pin        = new MentoringPin();
        $pin->setMentor($profile)->setRequest($req);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn($pin);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($mentorUser, $requestRepo, $pinRepo, $mentorProfileRepo, $em)->unpin(5);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertFalse($pin->isActive());
    }

    public function testUnpinReturns404WhenRequestNotFound(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn(null);

        $response = $this->makeController($mentorUser, $requestRepo, mentorProfileRepo: $mentorProfileRepo)->unpin(999);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUnpinReturns404WhenNoPinFound(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'Junior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $req        = $this->buildRequest(5, $junior);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($mentorUser, $requestRepo, $pinRepo, $mentorProfileRepo)->unpin(5);

        $this->assertSame(404, $response->getStatusCode());
    }
}
