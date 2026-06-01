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

    // ======================================================================
    //  Helpers pour QueryBuilder
    // ======================================================================

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

    // ======================================================================
    //  mentorActiveSessions()
    // ======================================================================

    public function testMentorActiveSessionsReturnsList(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $junior);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('createQueryBuilder')->willReturn($this->makeQueryBuilderMock([$session]));

        $response = $this->makeController($mentorUser, $sessionRepo, $mentorProfileRepo)->mentorActiveSessions();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame(42, $payload[0]['id']);
    }

    // ======================================================================
    //  mentorAllSessions()
    // ======================================================================

    public function testMentorAllSessionsReturnsList(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');
        $junior     = $this->buildUser(2, 'Alice');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $s1         = $this->buildSession(42, $profile, $junior);
        $s2         = $this->buildSession(43, $profile, $junior);
        $s2->setStatus(MentoringSessionStatus::COMPLETED);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('createQueryBuilder')->willReturn($this->makeQueryBuilderMock([$s1, $s2]));

        $response = $this->makeController($mentorUser, $sessionRepo, $mentorProfileRepo)->mentorAllSessions();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
    }

    // ======================================================================
    //  getSession() — succès
    // ======================================================================

    public function testGetSessionSuccessForParticipant(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $response = $this->makeController($alice, $sessionRepo)->getSession(42);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(42, $payload['id']);
    }

    // ======================================================================
    //  startSession() — erreurs
    // ======================================================================

    public function testStartSessionReturns404WhenNotFound(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn(null);

        $response = $this->makeController($mentorUser, $sessionRepo)->startSession(99);
        $this->assertSame(404, $response->getStatusCode());
    }

    public function testStartSessionReturns403WhenNotMentor(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        // C'est le junior qui tente de démarrer (alors que seul le mentor peut)
        $response = $this->makeController($alice, $sessionRepo)->startSession(42);
        $this->assertSame(403, $response->getStatusCode());
    }

    public function testStartSessionReturns422WhenStatusIsNotScheduled(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);
        $session->setStatus(MentoringSessionStatus::COMPLETED);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $response = $this->makeController($mentorUser, $sessionRepo)->startSession(42);
        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('SESSION_NOT_STARTABLE', $payload['code']);
    }

    // ======================================================================
    //  completeSession() — erreurs
    // ======================================================================

    public function testCompleteSessionReturns404WhenNotFound(): void
    {
        $mentorUser = $this->buildUser(1, 'Bob');

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn(null);

        $response = $this->makeController($mentorUser, $sessionRepo)->completeSession(99);
        $this->assertSame(404, $response->getStatusCode());
    }

    public function testCompleteSessionReturns403WhenNotOwnerMentor(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $otherMentor = $this->buildUser(3, 'Carol');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $otherProfile = $this->buildMentorProfile(11, $otherMentor);
        $session    = $this->buildSession(42, $profile, $alice);
        $session->setStatus(MentoringSessionStatus::IN_PROGRESS);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        // L'autre mentor essaye de compléter (le profile de l'autre est retourné par findOneBy)
        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($otherProfile);

        $response = $this->makeController($otherMentor, $sessionRepo, $mentorProfileRepo)->completeSession(42);
        $this->assertSame(403, $response->getStatusCode());
    }

    public function testCompleteSessionReturns422WhenStatusIsNotInProgress(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);
        // status = SCHEDULED par défaut, pas IN_PROGRESS

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $response = $this->makeController($mentorUser, $sessionRepo, $mentorProfileRepo)->completeSession(42);
        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('SESSION_NOT_COMPLETABLE', $payload['code']);
    }

    // ======================================================================
    //  scheduleSession()
    // ======================================================================

    public function testScheduleSessionSuccessAsJunior(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        // La notification doit être envoyée au mentor (recipient ≠ user)
        $notif = $this->createMock(NotificationService::class);
        $notif->expects($this->once())->method('createAndPush')
            ->with($mentorUser, $alice);

        $scheduledIso = (new \DateTime('+3 days'))->format('c');
        $request = new \Symfony\Component\HttpFoundation\Request(content: json_encode(['scheduledAt' => $scheduledIso]));

        $response = $this->makeController($alice, $sessionRepo, em: $em, notificationService: $notif)->scheduleSession(42, $request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertNotNull($session->getScheduledAt());
    }

    public function testScheduleSessionSuccessAsMentor(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        // La notification va au junior cette fois
        $notif = $this->createMock(NotificationService::class);
        $notif->expects($this->once())->method('createAndPush')
            ->with($alice, $mentorUser);

        $scheduledIso = (new \DateTime('+2 days'))->format('c');
        $request = new \Symfony\Component\HttpFoundation\Request(content: json_encode(['scheduledAt' => $scheduledIso]));

        $response = $this->makeController($mentorUser, $sessionRepo, notificationService: $notif)->scheduleSession(42, $request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testScheduleSessionReturns404WhenNotFound(): void
    {
        $alice = $this->buildUser(1);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn(null);

        $request = new \Symfony\Component\HttpFoundation\Request(content: json_encode(['scheduledAt' => '2026-06-01T10:00:00']));
        $response = $this->makeController($alice, $sessionRepo)->scheduleSession(99, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testScheduleSessionReturns403WhenNotParticipant(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $stranger   = $this->buildUser(3, 'Eve');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $request = new \Symfony\Component\HttpFoundation\Request(content: json_encode(['scheduledAt' => '2026-06-01T10:00:00']));
        $response = $this->makeController($stranger, $sessionRepo)->scheduleSession(42, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testScheduleSessionReturns422WhenDateIsMissing(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $request = new \Symfony\Component\HttpFoundation\Request(content: json_encode([]));
        $response = $this->makeController($alice, $sessionRepo)->scheduleSession(42, $request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('La date est requise.', $payload['error']);
    }

    public function testScheduleSessionReturns422WhenDateIsInvalid(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $request = new \Symfony\Component\HttpFoundation\Request(content: json_encode(['scheduledAt' => 'pas-une-date']));
        $response = $this->makeController($alice, $sessionRepo)->scheduleSession(42, $request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Format de date invalide.', $payload['error']);
    }

    // ======================================================================
    //  cancelSession() — erreurs
    // ======================================================================

    public function testCancelSessionReturns404WhenNotFound(): void
    {
        $alice = $this->buildUser(1);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn(null);

        $response = $this->makeController($alice, $sessionRepo)->cancelSession(99);
        $this->assertSame(404, $response->getStatusCode());
    }

    public function testCancelSessionReturns403WhenNotParticipant(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $stranger   = $this->buildUser(3, 'Eve');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $response = $this->makeController($stranger, $sessionRepo)->cancelSession(42);
        $this->assertSame(403, $response->getStatusCode());
    }

    public function testCancelSessionReturns422WhenStatusIsNotCancellable(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(42, $profile, $alice);
        $session->setStatus(MentoringSessionStatus::COMPLETED);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $response = $this->makeController($alice, $sessionRepo)->cancelSession(42);
        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('SESSION_NOT_CANCELLABLE', $payload['code']);
    }
}
