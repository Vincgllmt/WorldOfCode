<?php

namespace App\Tests\Controller;

use App\Controller\SessionAppointmentController;
use App\Entity\MentorProfile;
use App\Entity\MentoringSession;
use App\Entity\SessionAppointment;
use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Enum\SessionFormat;
use App\Enum\UserRole;
use App\Repository\MentoringSessionRepository;
use App\Repository\MentorProfileRepository;
use App\Repository\SessionAppointmentRepository;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * MentorBob   = mentor authentifié (participant)
 * AliceJunior = junior authentifié (participant)
 * CarolOther  = utilisateur tiers (pour tests 403)
 */
class SessionAppointmentControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'MentorBob'): User
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
        return $profile;
    }

    private function buildSession(int $id, MentorProfile $mentor, User $junior): MentoringSession
    {
        $session = new MentoringSession();
        $session->setMentor($mentor)->setJunior($junior)
            ->setFormat(SessionFormat::TEXT)
            ->setStatus(MentoringSessionStatus::SCHEDULED);
        $idProp = new \ReflectionProperty(MentoringSession::class, 'id');
        $idProp->setValue($session, $id);
        $session->onCreate();
        return $session;
    }

    private function buildAppointment(
        int $id,
        MentoringSession $session,
        string $proposedBy = 'mentor',
        string $status = 'pending',
    ): SessionAppointment {
        $appt = new SessionAppointment();
        $appt->setSession($session)
            ->setScheduledAt(new \DateTime('+1 day'))
            ->setFormat(SessionFormat::TEXT)
            ->setProposedBy($proposedBy)
            ->setStatus($status);
        $idProp = new \ReflectionProperty(SessionAppointment::class, 'id');
        $idProp->setValue($appt, $id);
        $appt->onCreate();
        return $appt;
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
        ?SessionAppointmentRepository $appointmentRepo = null,
        ?EntityManagerInterface $em = null,
        ?NotificationService $notificationService = null,
        bool $isGranted = true,
    ): SessionAppointmentController {
        $controller = new SessionAppointmentController(
            $sessionRepo        ?? $this->createMock(MentoringSessionRepository::class),
            $mentorProfileRepo  ?? $this->createMock(MentorProfileRepository::class),
            $appointmentRepo    ?? $this->createMock(SessionAppointmentRepository::class),
            $em                 ?? $this->createMock(EntityManagerInterface::class),
            $notificationService ?? $this->createMock(NotificationService::class),
        );
        $controller->setContainer($this->makeContainer($currentUser, $isGranted));
        return $controller;
    }

    private function makeJsonRequest(array $data): Request
    {
        return new Request([], [], [], [], [], [], json_encode($data));
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturns200WithAppointmentsForMentor(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(1, $session);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->with(5)->willReturn($session);
        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('findBy')->willReturn([$appt]);

        $response = $this->makeController($mentorUser, $sessionRepo, appointmentRepo: $appointmentRepo)->list(5);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertSame(1, $payload[0]['id']);
        $this->assertSame('mentor', $payload[0]['proposedBy']);
    }

    public function testListReturns200ForJunior(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);
        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('findBy')->willReturn([]);

        $response = $this->makeController($junior, $sessionRepo, appointmentRepo: $appointmentRepo)->list(5);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(0, $payload);
    }

    public function testListReturns403ForUnrelatedUser(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $other      = $this->buildUser(3, 'CarolOther');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $response = $this->makeController($other, $sessionRepo)->list(5);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testListReturns404WhenSessionNotFound(): void
    {
        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn(null);

        $response = $this->makeController($this->buildUser(1), $sessionRepo)->list(999);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  create()
    // ======================================================================

    public function testCreateReturns201WhenMentorProposesAppointment(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('persist')
            ->willReturnCallback(fn(SessionAppointment $a) => $a->onCreate());
        $em->expects($this->once())->method('flush');

        $request  = $this->makeJsonRequest(['scheduledAt' => (new \DateTime('+1 day'))->format('c'), 'format' => 'text']);
        $response = $this->makeController($mentorUser, $sessionRepo, em: $em)->create(5, $request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('pending', $payload['status']);
        $this->assertSame('mentor', $payload['proposedBy']);
        $this->assertSame('text', $payload['format']);
    }

    public function testCreateReturns201WhenJuniorCounterProposes(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(fn(SessionAppointment $a) => $a->onCreate());
        $em->method('flush');

        $request  = $this->makeJsonRequest(['scheduledAt' => (new \DateTime('+2 days'))->format('c')]);
        $response = $this->makeController($junior, $sessionRepo, em: $em)->create(5, $request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('junior', $payload['proposedBy']);
        $this->assertSame('pending', $payload['status']);
    }

    public function testCreateReturns422WhenScheduledAtMissing(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $request  = $this->makeJsonRequest(['format' => 'text']);
        $response = $this->makeController($mentorUser, $sessionRepo)->create(5, $request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testCreateReturns403WhenUnrelatedUser(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $other      = $this->buildUser(3, 'CarolOther');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $request  = $this->makeJsonRequest(['scheduledAt' => (new \DateTime('+1 day'))->format('c')]);
        $response = $this->makeController($other, $sessionRepo)->create(5, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testCreateReturns422WhenScheduledAtHasInvalidFormat(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        // Format de date invalide → DateTime jette une Exception
        $request  = $this->makeJsonRequest(['scheduledAt' => 'pas-une-date-du-tout']);
        $response = $this->makeController($mentorUser, $sessionRepo)->create(5, $request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Format de date invalide.', $payload['error']);
    }

    public function testCreateReturns404WhenSessionNotFound(): void
    {
        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn(null);

        $request  = $this->makeJsonRequest(['scheduledAt' => '2026-06-01T10:00:00']);
        $response = $this->makeController($this->buildUser(1), $sessionRepo)->create(999, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  getOne()
    // ======================================================================

    public function testGetOneReturns200ForParticipant(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session);

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->with(20)->willReturn($appt);

        $response = $this->makeController($mentorUser, appointmentRepo: $appointmentRepo)->getOne(5, 20);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(20, $payload['id']);
    }

    public function testGetOneReturns404WhenSessionIdMismatch(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session); // session.id = 5

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);

        // sessionId=99 ne correspond pas à session.id=5
        $response = $this->makeController($mentorUser, appointmentRepo: $appointmentRepo)->getOne(99, 20);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testGetOneReturns403ForUnrelatedUser(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $other      = $this->buildUser(3, 'CarolOther');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session);

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);

        $response = $this->makeController($other, appointmentRepo: $appointmentRepo)->getOne(5, 20);

        $this->assertSame(403, $response->getStatusCode());
    }

    // ======================================================================
    //  confirm()
    // ======================================================================

    public function testConfirmReturns200WhenJuniorConfirmsMentorProposal(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session, 'mentor', 'pending');

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($junior, appointmentRepo: $appointmentRepo, em: $em)->confirm(5, 20);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('confirmed', $appt->getStatus());
    }

    public function testConfirmReturns200WhenMentorConfirmsJuniorCounterProposal(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session, 'junior', 'pending');

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($mentorUser, appointmentRepo: $appointmentRepo, em: $em)->confirm(5, 20);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('confirmed', $appt->getStatus());
    }

    public function testConfirmReturns403WhenMentorTriesToConfirmOwnProposal(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session, 'mentor', 'pending');

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);

        $response = $this->makeController($mentorUser, appointmentRepo: $appointmentRepo)->confirm(5, 20);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testConfirmReturns403WhenJuniorTriesToConfirmOwnCounterProposal(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session, 'junior', 'pending');

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);

        $response = $this->makeController($junior, appointmentRepo: $appointmentRepo)->confirm(5, 20);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testConfirmReturns422WhenAlreadyConfirmed(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session, 'mentor', 'confirmed');

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);

        $response = $this->makeController($junior, appointmentRepo: $appointmentRepo)->confirm(5, 20);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testConfirmReturns404WhenNotFound(): void
    {
        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn(null);

        $response = $this->makeController($this->buildUser(2, 'AliceJunior'), appointmentRepo: $appointmentRepo)->confirm(5, 999);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  refuse()
    // ======================================================================

    public function testRefuseReturns200WhenJuniorRefusesMentorProposal(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session, 'mentor', 'pending');

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($junior, appointmentRepo: $appointmentRepo, em: $em)->refuse(5, 20);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('refused', $appt->getStatus());
    }

    public function testRefuseReturns200WhenMentorRefusesJuniorCounterProposal(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session, 'junior', 'pending');

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($mentorUser, appointmentRepo: $appointmentRepo, em: $em)->refuse(5, 20);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('refused', $appt->getStatus());
    }

    public function testRefuseReturns403WhenMentorTriesToRefuseOwnProposal(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session, 'mentor', 'pending');

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);

        $response = $this->makeController($mentorUser, appointmentRepo: $appointmentRepo)->refuse(5, 20);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testRefuseReturns403WhenJuniorTriesToRefuseOwnCounterProposal(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session, 'junior', 'pending');

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);

        $response = $this->makeController($junior, appointmentRepo: $appointmentRepo)->refuse(5, 20);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testRefuseReturns422WhenAlreadyConfirmed(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session, 'mentor', 'confirmed');

        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);

        $response = $this->makeController($junior, appointmentRepo: $appointmentRepo)->refuse(5, 20);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testRefuseReturns404WhenNotFound(): void
    {
        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn(null);

        $response = $this->makeController($this->buildUser(2), appointmentRepo: $appointmentRepo)->refuse(5, 999);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  delete()
    // ======================================================================

    public function testDeleteReturns204WhenMentorDeletesOwnSessionAppointment(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $appt       = $this->buildAppointment(20, $session);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);
        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('remove')->with($appt);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController(
            $mentorUser,
            mentorProfileRepo: $mentorProfileRepo,
            appointmentRepo: $appointmentRepo,
            em: $em,
        )->delete(5, 20);

        $this->assertSame(204, $response->getStatusCode());
    }

    public function testDeleteReturns403WhenMentorIsNotSessionOwner(): void
    {
        $mentorUser  = $this->buildUser(1, 'MentorBob');
        $junior      = $this->buildUser(2, 'AliceJunior');
        $otherMentor = $this->buildUser(3, 'CarolMentor');
        $profile     = $this->buildMentorProfile(10, $mentorUser);
        $otherProfile = $this->buildMentorProfile(11, $otherMentor);
        $session     = $this->buildSession(5, $profile, $junior);
        $appt        = $this->buildAppointment(20, $session);

        // otherMentor est connecté mais la session appartient à profile
        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($otherProfile);
        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn($appt);

        $response = $this->makeController(
            $otherMentor,
            mentorProfileRepo: $mentorProfileRepo,
            appointmentRepo: $appointmentRepo,
        )->delete(5, 20);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testDeleteReturns404WhenNotFound(): void
    {
        $appointmentRepo = $this->createMock(SessionAppointmentRepository::class);
        $appointmentRepo->method('find')->willReturn(null);

        $response = $this->makeController($this->buildUser(1), appointmentRepo: $appointmentRepo)->delete(5, 999);

        $this->assertSame(404, $response->getStatusCode());
    }
}
