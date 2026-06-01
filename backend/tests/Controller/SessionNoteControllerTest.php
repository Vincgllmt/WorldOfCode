<?php

namespace App\Tests\Controller;

use App\Controller\SessionNoteController;
use App\Entity\MentorProfile;
use App\Entity\MentoringSession;
use App\Entity\SessionNote;
use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Enum\SessionFormat;
use App\Enum\UserRole;
use App\Repository\MentoringSessionRepository;
use App\Repository\SessionNoteRepository;
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
class SessionNoteControllerTest extends TestCase
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
        $profile  = new MentorProfile();
        $idProp   = new \ReflectionProperty(MentorProfile::class, 'id');
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

    private function buildNote(int $id, MentoringSession $session, User $author, string $type = 'note'): SessionNote
    {
        $note = new SessionNote();
        $note->setSession($session)->setAuthor($author)->setContent('Contenu de test')->setType($type);
        $idProp = new \ReflectionProperty(SessionNote::class, 'id');
        $idProp->setValue($note, $id);
        $note->onCreate();
        return $note;
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
        ?SessionNoteRepository $noteRepo = null,
        ?EntityManagerInterface $em = null,
    ): SessionNoteController {
        $controller = new SessionNoteController(
            $sessionRepo ?? $this->createMock(MentoringSessionRepository::class),
            $noteRepo    ?? $this->createMock(SessionNoteRepository::class),
            $em          ?? $this->createMock(EntityManagerInterface::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    private function makeJsonRequest(array $data): Request
    {
        return new Request([], [], [], [], [], [], json_encode($data));
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturns200WithNotesForMentor(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $note1      = $this->buildNote(1, $session, $mentorUser);
        $note2      = $this->buildNote(2, $session, $junior, 'link');

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->with(5)->willReturn($session);
        $noteRepo = $this->createMock(SessionNoteRepository::class);
        $noteRepo->method('findBy')->willReturn([$note1, $note2]);

        $response = $this->makeController($mentorUser, $sessionRepo, $noteRepo)->list(5);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame('note', $payload[0]['type']);
        $this->assertSame('link', $payload[1]['type']);
        $this->assertSame('MentorBob', $payload[0]['author']['username']);
    }

    public function testListReturns200WithNotesForJunior(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);
        $noteRepo = $this->createMock(SessionNoteRepository::class);
        $noteRepo->method('findBy')->willReturn([]);

        $response = $this->makeController($junior, $sessionRepo, $noteRepo)->list(5);

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

    public function testCreateReturns201WithTypeNote(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('persist')
            ->willReturnCallback(fn(SessionNote $n) => $n->onCreate());
        $em->expects($this->once())->method('flush');

        $request  = $this->makeJsonRequest(['content' => 'Voici ma note.', 'type' => 'note']);
        $response = $this->makeController($mentorUser, $sessionRepo, em: $em)->create(5, $request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('Voici ma note.', $payload['content']);
        $this->assertSame('note', $payload['type']);
        $this->assertSame('MentorBob', $payload['author']['username']);
    }

    public function testCreateReturns201WithTypeLink(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(fn(SessionNote $n) => $n->onCreate());
        $em->method('flush');

        $request  = $this->makeJsonRequest(['content' => 'https://example.com', 'type' => 'link']);
        $response = $this->makeController($junior, $sessionRepo, em: $em)->create(5, $request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('link', $payload['type']);
    }

    public function testCreateDefaultsToNoteWhenTypeIsInvalid(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(fn(SessionNote $n) => $n->onCreate());
        $em->method('flush');

        $request  = $this->makeJsonRequest(['content' => 'Texte libre.', 'type' => 'invalid_type']);
        $response = $this->makeController($mentorUser, $sessionRepo, em: $em)->create(5, $request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('note', $payload['type']);
    }

    public function testCreateReturns422WhenContentIsEmpty(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $request  = $this->makeJsonRequest(['content' => '   ', 'type' => 'note']);
        $response = $this->makeController($mentorUser, $sessionRepo)->create(5, $request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testCreateReturns403ForUnrelatedUser(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $other      = $this->buildUser(3, 'CarolOther');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $request  = $this->makeJsonRequest(['content' => 'Tentative.', 'type' => 'note']);
        $response = $this->makeController($other, $sessionRepo)->create(5, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testCreateReturns404WhenSessionNotFound(): void
    {
        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn(null);

        $request  = $this->makeJsonRequest(['content' => 'Note.', 'type' => 'note']);
        $response = $this->makeController($this->buildUser(1), $sessionRepo)->create(999, $request);

        $this->assertSame(404, $response->getStatusCode());
    }

    // ======================================================================
    //  delete()
    // ======================================================================

    public function testDeleteReturns200WhenAuthorDeletesOwnNote(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $note       = $this->buildNote(30, $session, $mentorUser);

        $noteRepo = $this->createMock(SessionNoteRepository::class);
        $noteRepo->method('find')->with(30)->willReturn($note);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('remove')->with($note);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($mentorUser, noteRepo: $noteRepo, em: $em)->delete(5, 30);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('message', $payload);
    }

    public function testDeleteReturns200WhenJuniorDeletesOwnNote(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $note       = $this->buildNote(30, $session, $junior);

        $noteRepo = $this->createMock(SessionNoteRepository::class);
        $noteRepo->method('find')->willReturn($note);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('remove');
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($junior, noteRepo: $noteRepo, em: $em)->delete(5, 30);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testDeleteReturns403WhenNonAuthorTriesToDelete(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior);
        $note       = $this->buildNote(30, $session, $mentorUser); // note du mentor

        $noteRepo = $this->createMock(SessionNoteRepository::class);
        $noteRepo->method('find')->willReturn($note);

        // Junior essaie de supprimer la note du mentor
        $response = $this->makeController($junior, noteRepo: $noteRepo)->delete(5, 30);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testDeleteReturns404WhenNoteNotFound(): void
    {
        $noteRepo = $this->createMock(SessionNoteRepository::class);
        $noteRepo->method('find')->willReturn(null);

        $response = $this->makeController($this->buildUser(1), noteRepo: $noteRepo)->delete(5, 999);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testDeleteReturns404WhenSessionIdMismatch(): void
    {
        $mentorUser = $this->buildUser(1, 'MentorBob');
        $junior     = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $session    = $this->buildSession(5, $profile, $junior); // session.id = 5
        $note       = $this->buildNote(30, $session, $mentorUser);

        $noteRepo = $this->createMock(SessionNoteRepository::class);
        $noteRepo->method('find')->willReturn($note);

        // sessionId=99 ne correspond pas à session.id=5
        $response = $this->makeController($mentorUser, noteRepo: $noteRepo)->delete(99, 30);

        $this->assertSame(404, $response->getStatusCode());
    }
}
