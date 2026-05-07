<?php

namespace App\Tests\Controller;

use App\Controller\MentoringSessionController;
use App\Entity\MentorProfile;
use App\Entity\MentoringSession;
use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Enum\SessionFormat;
use App\Enum\UserRole;
use App\Repository\MentoringSessionRepository;
use App\Repository\MentorProfileRepository;
use App\Service\Mentoring\MentoringSessionService;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MentoringSessionControllerTest extends TestCase
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
        $idProp = new \ReflectionProperty(MentorProfile::class, 'id');
        $idProp->setValue($profile, $id);
        $userProp = new \ReflectionProperty(MentorProfile::class, 'user');
        $userProp->setValue($profile, $user);
        return $profile;
    }

    private function buildSession(int $id, MentorProfile $mentor, User $junior): MentoringSession
    {
        $session = new MentoringSession();
        $idProp = new \ReflectionProperty(MentoringSession::class, 'id');
        $idProp->setValue($session, $id);
        $session->setMentor($mentor);
        $session->setJunior($junior);
        $session->setFormat(SessionFormat::TEXT);
        $session->onCreate();
        return $session;
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

    private function makeController(
        User $currentUser,
        ?MentoringSessionRepository $sessionRepo = null,
        ?MentorProfileRepository $mentorProfileRepo = null,
        ?MentoringSessionService $sessionService = null,
        ?EntityManagerInterface $em = null,
        ?NotificationService $notificationService = null,
    ): MentoringSessionController {
        $em = $em ?? $this->createMock(EntityManagerInterface::class);
        $controller = new MentoringSessionController(
            $sessionRepo ?? $this->createMock(MentoringSessionRepository::class),
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
            $sessionService ?? $this->createMock(MentoringSessionService::class),
            $em,
            $notificationService ?? $this->createMock(NotificationService::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    // ======================================================================
    //  mySessions()
    // ======================================================================

    public function testMySessionsReturnsList(): void
    {
        $alice = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile = $this->buildMentorProfile(10, $mentorUser);
        $session = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->with(['junior' => $alice], ['createdAt' => 'DESC'])
            ->willReturn([$session]);

        $response = $this->makeController($alice, $sessionRepo)->mySessions();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame(42, $payload[0]['id']);
        $this->assertSame('scheduled', $payload[0]['status']);
        $this->assertSame('text', $payload[0]['format']);
    }

    // ======================================================================
    //  getSession()
    // ======================================================================

    public function testGetSessionReturns403ForNonParticipant(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $stranger   = $this->buildUser(3, 'Charlie');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->with(42)->willReturn($session);

        $response = $this->makeController($stranger, $sessionRepo)->getSession(42);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testGetSessionReturns404(): void
    {
        $alice = $this->buildUser(1);
        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn(null);

        $response = $this->makeController($alice, $sessionRepo)->getSession(99);
        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  startSession()
    // ======================================================================

    public function testStartSessionSetsInProgress(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->with(42)->willReturn($session);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($mentorUser, $sessionRepo, em: $em)->startSession(42);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(MentoringSessionStatus::IN_PROGRESS, $session->getStatus());
        $this->assertNotNull($session->getStartedAt());
    }

    // ======================================================================
    //  completeSession()
    // ======================================================================

    public function testCompleteSessionCallsService(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $junior);
        $session->setStatus(MentoringSessionStatus::IN_PROGRESS);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->with(42)->willReturn($session);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->with(['user' => $mentorUser])->willReturn($profile);

        $sessionService = $this->createMock(MentoringSessionService::class);
        $sessionService->expects($this->once())->method('complete')->with($session);

        $response = $this->makeController($mentorUser, $sessionRepo, $mentorProfileRepo, $sessionService)->completeSession(42);

        $this->assertSame(200, $response->getStatusCode());
    }

    // ======================================================================
    //  cancelSession()
    // ======================================================================

    public function testCancelSessionSetsCancelled(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->with(42)->willReturn($session);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($alice, $sessionRepo, em: $em)->cancelSession(42);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(MentoringSessionStatus::CANCELLED, $session->getStatus());
    }
}
