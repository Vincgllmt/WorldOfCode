<?php

namespace App\Tests\Controller;

use App\Controller\MentoringRequestController;
use App\Entity\MentoringRequest;
use App\Entity\MentorProfile;
use App\Entity\User;
use App\Enum\MentoringRequestStatus;
use App\Enum\MentoringRequestType;
use App\Enum\UserRole;
use App\Repository\MentoringRequestRepository;
use App\Repository\MentoringSessionRepository;
use App\Repository\MentorProfileRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * Tests unitaires du MentoringRequestController
 *
 * AliceJunior  = junior authentifié
 * BobJunior    = autre junior (pour tests 403)
 */
class MentoringRequestControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'AliceJunior'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@world-of-code.dev')
            ->setFirstname($username)
            ->setLastname('Dev')
            ->setPassword('SecurePass!42')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildRequest(int $id, User $junior): MentoringRequest
    {
        $req = new MentoringRequest();
        $req->setJunior($junior);
        $req->setType(MentoringRequestType::DEBUG);
        $req->setTitle('Problème Symfony');
        $req->setTechStack('PHP');
        $req->setDescription('Je suis bloqué sur un listener.');
        $req->setIsPublic(true);
        $req->onCreate();

        $idProp = new \ReflectionProperty(MentoringRequest::class, 'id');
        $idProp->setValue($req, $id);

        return $req;
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
        $container->method('get')->willReturnCallback(
            fn(string $id) => match ($id) {
                'security.token_storage'         => $tokenStorage,
                'security.authorization_checker' => $authChecker,
                default => throw new \RuntimeException("Service inattendu : $id"),
            }
        );

        return $container;
    }

    private function makeController(
        User $currentUser,
        ?MentoringRequestRepository $requestRepo = null,
        ?MentorProfileRepository $mentorProfileRepo = null,
        ?MentoringSessionRepository $sessionRepo = null,
        ?EntityManagerInterface $em = null,
        bool $isGranted = true,
    ): MentoringRequestController {
        $em = $em ?? $this->createMock(EntityManagerInterface::class);

        $controller = new MentoringRequestController(
            $requestRepo ?? $this->createMock(MentoringRequestRepository::class),
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
            $sessionRepo ?? $this->createMock(MentoringSessionRepository::class),
            $em,
        );
        $controller->setContainer($this->makeContainer($currentUser, $isGranted));

        return $controller;
    }

    private function makeJsonRequest(array $data): Request
    {
        return new Request([], [], [], [], [], [], json_encode($data));
    }

    // ======================================================================
    //  create() — AC 1, 6
    // ======================================================================

    public function testCreateReturns201WithPendingStatus(): void
    {
        $alice = $this->buildUser(1);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('persist')->willReturnCallback(
            function (MentoringRequest $req): void {
                $req->onCreate(); // simule PrePersist
            }
        );
        $em->expects($this->exactly(2))->method('flush');

        $request = $this->makeJsonRequest([
            'type'        => 'debug',
            'title'       => 'Problème Symfony',
            'techStack'   => 'PHP',
            'description' => 'Je suis bloqué.',
        ]);

        $response = $this->makeController($alice, em: $em)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('pending', $payload['status']);
        $this->assertSame('debug', $payload['type']);
        $this->assertSame('Problème Symfony', $payload['title']);
        $this->assertGreaterThanOrEqual(60, $payload['compatibilityScore']);
        $this->assertLessThanOrEqual(99, $payload['compatibilityScore']);
    }

    public function testCreateReturns422WhenTitleIsEmpty(): void
    {
        $alice = $this->buildUser(1);
        $request = $this->makeJsonRequest([
            'type'        => 'debug',
            'title'       => '',
            'techStack'   => 'PHP',
            'description' => 'test',
        ]);

        $response = $this->makeController($alice)->create($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testCreateReturns422WhenTitleExceeds255Chars(): void
    {
        $alice = $this->buildUser(1);
        $request = $this->makeJsonRequest([
            'type'        => 'debug',
            'title'       => str_repeat('a', 256),
            'techStack'   => 'PHP',
            'description' => 'test',
        ]);

        $response = $this->makeController($alice)->create($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testCreateReturns422WhenTechStackIsEmpty(): void
    {
        $alice = $this->buildUser(1);
        $request = $this->makeJsonRequest([
            'type'        => 'debug',
            'title'       => 'Titre valide',
            'techStack'   => '',
            'description' => 'test',
        ]);

        $response = $this->makeController($alice)->create($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testCreateReturns422WhenTypeIsInvalid(): void
    {
        $alice = $this->buildUser(1);
        $request = $this->makeJsonRequest([
            'type'        => 'invalid_type',
            'title'       => 'Titre valide',
            'techStack'   => 'PHP',
            'description' => 'test',
        ]);

        $response = $this->makeController($alice)->create($request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testCreateWithTargetMentorForcesIsPublicFalse(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'BobMentor');

        $mentor = new MentorProfile();
        (new \ReflectionProperty(MentorProfile::class, 'id'))->setValue($mentor, 42);
        (new \ReflectionProperty(MentorProfile::class, 'user'))->setValue($mentor, $bob);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('find')->with(42)->willReturn($mentor);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(fn(MentoringRequest $req) => $req->onCreate());
        $em->method('flush');

        $request = $this->makeJsonRequest([
            'type'          => 'one_to_one',
            'title'         => 'Session ciblée',
            'techStack'     => 'PHP',
            'description'   => 'Je veux ce mentor.',
            'targetMentorId' => 42,
        ]);

        $response = $this->makeController($alice, mentorProfileRepo: $mentorProfileRepo, em: $em)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertFalse($payload['isPublic']);
        $this->assertSame(42, $payload['targetMentorId']);
    }

    // ======================================================================
    //  myRequests() — AC 2
    // ======================================================================

    public function testMyRequestsReturnsCurrentUserRequests(): void
    {
        $alice = $this->buildUser(1);
        $req1  = $this->buildRequest(10, $alice);
        $req2  = $this->buildRequest(11, $alice);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findBy')->with(['junior' => $alice], ['createdAt' => 'DESC'])
            ->willReturn([$req1, $req2]);

        $response = $this->makeController($alice, requestRepo: $requestRepo)->myRequests();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame(10, $payload[0]['id']);
        $this->assertSame(11, $payload[1]['id']);
    }

    // ======================================================================
    //  update() — AC 3, 7
    // ======================================================================

    public function testUpdateReturnsMentoringRequestWhenPending(): void
    {
        $alice = $this->buildUser(1);
        $req   = $this->buildRequest(10, $alice);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(10)->willReturn($req);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $request  = $this->makeJsonRequest(['title' => 'Nouveau titre']);
        $response = $this->makeController($alice, requestRepo: $requestRepo, em: $em)->update(10, $request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Nouveau titre', $payload['title']);
    }

    public function testUpdateReturns422WithCodeWhenNotPending(): void
    {
        $alice = $this->buildUser(1);
        $req   = $this->buildRequest(10, $alice);
        $req->setStatus(MentoringRequestStatus::ACCEPTED);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(10)->willReturn($req);

        $request  = $this->makeJsonRequest(['title' => 'Nouveau titre']);
        $response = $this->makeController($alice, requestRepo: $requestRepo)->update(10, $request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('REQUEST_NOT_MODIFIABLE', $payload['code']);
    }

    public function testUpdateReturns403WhenNotOwner(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'BobJunior');
        $req   = $this->buildRequest(10, $bob); // appartient à Bob

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(10)->willReturn($req);

        $request  = $this->makeJsonRequest(['title' => 'Hack']);
        $response = $this->makeController($alice, requestRepo: $requestRepo)->update(10, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testUpdateReturns404WhenNotFound(): void
    {
        $alice = $this->buildUser(1);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn(null);

        $request  = $this->makeJsonRequest(['title' => 'test']);
        $response = $this->makeController($alice, requestRepo: $requestRepo)->update(999, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  makePublic() — AC 4
    // ======================================================================

    public function testMakePublicSetsIsPublicTrue(): void
    {
        $alice = $this->buildUser(1);
        $req   = $this->buildRequest(10, $alice);
        $req->setIsPublic(false);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(10)->willReturn($req);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($alice, requestRepo: $requestRepo, em: $em)->makePublic(10);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['isPublic']);
    }

    public function testMakePublicReturns422WhenAlreadyPublic(): void
    {
        $alice = $this->buildUser(1);
        $req   = $this->buildRequest(10, $alice);
        $req->setIsPublic(true); // déjà publique

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(10)->willReturn($req);

        $response = $this->makeController($alice, requestRepo: $requestRepo)->makePublic(10);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testMakePublicReturns403WhenNotOwner(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'BobJunior');
        $req   = $this->buildRequest(10, $bob);
        $req->setIsPublic(false);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(10)->willReturn($req);

        $response = $this->makeController($alice, requestRepo: $requestRepo)->makePublic(10);

        $this->assertSame(403, $response->getStatusCode());
    }

    // ======================================================================
    //  cancel() — AC 5
    // ======================================================================

    public function testCancelSetsCancelledStatus(): void
    {
        $alice = $this->buildUser(1);
        $req   = $this->buildRequest(10, $alice);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(10)->willReturn($req);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($alice, requestRepo: $requestRepo, em: $em)->cancel(10);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(MentoringRequestStatus::CANCELLED, $req->getStatus());
    }

    public function testCancelReturns403WhenNotOwner(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'BobJunior');
        $req   = $this->buildRequest(10, $bob);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(10)->willReturn($req);

        $response = $this->makeController($alice, requestRepo: $requestRepo)->cancel(10);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testCancelReturns404WhenNotFound(): void
    {
        $alice = $this->buildUser(1);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn(null);

        $response = $this->makeController($alice, requestRepo: $requestRepo)->cancel(999);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  myRequests() avec session — AC 11.4
    // ======================================================================

    public function testMyRequestsIncludesSessionWhenAccepted(): void
    {
        $alice = $this->buildUser(1);
        $req   = $this->buildRequest(10, $alice);
        $req->setStatus(\App\Enum\MentoringRequestStatus::ACCEPTED);

        // Mentor mock
        $mentorUser = $this->buildUser(99, 'BobMentor');
        $mentorProfile = $this->createMock(\App\Entity\MentorProfile::class);
        $mentorProfile->method('getUser')->willReturn($mentorUser);
        $mentorProfile->method('getId')->willReturn(5);

        // Session mock
        $session = $this->createMock(\App\Entity\MentoringSession::class);
        $session->method('getId')->willReturn(42);
        $session->method('getFormat')->willReturn(\App\Enum\SessionFormat::TEXT);
        $session->method('getConversationId')->willReturn('conv-abc');
        $session->method('getMentor')->willReturn($mentorProfile);
        $session->method('getStatus')->willReturn(\App\Enum\MentoringSessionStatus::SCHEDULED);
        $session->method('getScheduledAt')->willReturn(null);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findBy')->willReturn([$req]);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findOneBy')->with(['request' => $req])->willReturn($session);

        $response = $this->makeController($alice, requestRepo: $requestRepo, sessionRepo: $sessionRepo)->myRequests();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
        $this->assertNotNull($payload[0]['session']);
        $this->assertSame('text', $payload[0]['session']['format']);
        $this->assertSame('conv-abc', $payload[0]['session']['conversationId']);
        $this->assertSame('BobMentor', $payload[0]['session']['mentor']['username']);
    }

    public function testMyRequestsSessionNullWhenPending(): void
    {
        $alice = $this->buildUser(1);
        $req   = $this->buildRequest(10, $alice);
        // Status PENDING → pas de session

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findBy')->willReturn([$req]);

        $response = $this->makeController($alice, requestRepo: $requestRepo)->myRequests();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertNull($payload[0]['session']);
    }

    // ======================================================================
    //  Cas restants pour couverture 100%
    // ======================================================================

    public function testCreateReturns422WhenDescriptionIsEmpty(): void
    {
        $alice = $this->buildUser(1);
        $request = $this->makeJsonRequest([
            'type'        => 'debug',
            'title'       => 'Titre valide',
            'techStack'   => 'PHP',
            'description' => '',
        ]);

        $response = $this->makeController($alice)->create($request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('La description est requise.', $payload['error']);
    }

    public function testCreateReturns422WhenTargetMentorNotFound(): void
    {
        $alice = $this->buildUser(1);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('find')->willReturn(null);

        $request = $this->makeJsonRequest([
            'type'           => 'debug',
            'title'          => 'Demande ciblée',
            'techStack'      => 'PHP',
            'description'    => 'desc',
            'targetMentorId' => 999,
        ]);

        $response = $this->makeController($alice, mentorProfileRepo: $mentorProfileRepo)->create($request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('TARGET_MENTOR_NOT_FOUND', $payload['code']);
    }

    public function testCreateNotifiesMatchingAvailableMentors(): void
    {
        $alice = $this->buildUser(1);
        $bobMentor   = $this->buildUser(2, 'BobMentor');
        $caroMentor  = $this->buildUser(3, 'CarolMentor');

        // Mentor avec spécialité PHP (match) - doit recevoir notification
        $phpSpecialty = $this->createMock(\App\Entity\Skill::class);
        $phpSpecialty->method('getName')->willReturn('PHP');
        $bobProfile = $this->createMock(MentorProfile::class);
        $bobProfile->method('getUser')->willReturn($bobMentor);
        $bobProfile->method('getSpecialties')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([$phpSpecialty]));

        // Mentor avec spécialité JavaScript (mismatch) - skipped
        $jsSpecialty = $this->createMock(\App\Entity\Skill::class);
        $jsSpecialty->method('getName')->willReturn('JavaScript');
        $caroProfile = $this->createMock(MentorProfile::class);
        $caroProfile->method('getUser')->willReturn($caroMentor);
        $caroProfile->method('getSpecialties')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([$jsSpecialty]));

        // Mentor = soi-même → skipped (ligne 112)
        $aliceProfile = $this->createMock(MentorProfile::class);
        $aliceProfile->method('getUser')->willReturn($alice);
        $aliceProfile->method('getSpecialties')->willReturn(new \Doctrine\Common\Collections\ArrayCollection([$phpSpecialty]));

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findBy')->with(['isAvailable' => true])
            ->willReturn([$aliceProfile, $bobProfile, $caroProfile]);

        $em = $this->createMock(EntityManagerInterface::class);
        // 1 MentoringRequest + 1 Notification (Bob, le seul qui match)
        $persistedEntities = [];
        $em->method('persist')->willReturnCallback(function (object $entity) use (&$persistedEntities) {
            $persistedEntities[] = $entity;
            if ($entity instanceof MentoringRequest) {
                $entity->onCreate();
            }
        });
        $em->method('flush');

        $request = $this->makeJsonRequest([
            'type'        => 'debug',
            'title'       => 'Aide PHP',
            'techStack'   => 'PHP',
            'description' => 'desc',
        ]);

        $response = $this->makeController($alice, mentorProfileRepo: $mentorProfileRepo, em: $em)->create($request);

        $this->assertSame(201, $response->getStatusCode());

        // 1 MentoringRequest + 1 Notification (seul Bob match)
        $this->assertCount(2, $persistedEntities);
        $notifications = array_filter($persistedEntities, fn($e) => $e instanceof \App\Entity\Notification);
        $this->assertCount(1, $notifications);
        $notif = array_values($notifications)[0];
        $this->assertSame($bobMentor, $notif->getRecipient());
    }

    public function testUpdateReturns422WhenNewTitleExceeds255Chars(): void
    {
        $alice = $this->buildUser(1);
        $req   = $this->buildRequest(10, $alice);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(10)->willReturn($req);

        $request  = $this->makeJsonRequest(['title' => str_repeat('a', 256)]);
        $response = $this->makeController($alice, requestRepo: $requestRepo)->update(10, $request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('max 255', $payload['error']);
    }

    public function testMakePublicReturns404WhenRequestNotFound(): void
    {
        $alice = $this->buildUser(1);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn(null);

        $response = $this->makeController($alice, requestRepo: $requestRepo)->makePublic(999);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testCancelReturns422WhenRequestAlreadyCancelled(): void
    {
        $alice = $this->buildUser(1);
        $req   = $this->buildRequest(10, $alice);
        $req->setStatus(MentoringRequestStatus::CANCELLED);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(10)->willReturn($req);

        $response = $this->makeController($alice, requestRepo: $requestRepo)->cancel(10);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('REQUEST_NOT_CANCELLABLE', $payload['code']);
    }

    public function testCreateReturns422WhenTargetMentorIsSelf(): void
    {
        $alice = $this->buildUser(1, 'AliceJunior');

        $aliceMentorProfile = new MentorProfile();
        (new \ReflectionProperty(MentorProfile::class, 'id'))->setValue($aliceMentorProfile, 5);
        (new \ReflectionProperty(MentorProfile::class, 'user'))->setValue($aliceMentorProfile, $alice);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('find')->with(5)->willReturn($aliceMentorProfile);

        $request = $this->makeJsonRequest([
            'type'           => 'one_to_one',
            'title'          => 'Auto-ciblage',
            'techStack'      => 'PHP',
            'description'    => 'desc',
            'targetMentorId' => 5,
        ]);

        $response = $this->makeController($alice, mentorProfileRepo: $mentorProfileRepo)->create($request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('SELF_TARGETING_NOT_ALLOWED', $payload['code']);
    }
}
