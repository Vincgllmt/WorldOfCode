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
use App\Repository\MentorProfileRepository;
use App\Repository\MentoringPinRepository;
use App\Repository\MentoringRequestRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\DBAL\Driver\Exception as DriverException;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MentoringPinControllerTest extends TestCase
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

    private function buildRequest(int $id, User $junior, bool $isPublic = true, ?MentorProfile $target = null): MentoringRequest
    {
        $req = new MentoringRequest();
        $req->setJunior($junior)
            ->setType(MentoringRequestType::DEBUG)
            ->setTitle('Need help')
            ->setTechStack('PHP')
            ->setDescription('Blocked')
            ->setIsPublic($isPublic);
        if ($target) {
            $req->setTargetMentor($target);
        }
        $req->onCreate();
        (new \ReflectionProperty(MentoringRequest::class, 'id'))->setValue($req, $id);
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
            $requestRepo       ?? $this->createMock(MentoringRequestRepository::class),
            $pinRepo           ?? $this->createMock(MentoringPinRepository::class),
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
            $em                ?? $this->createMock(EntityManagerInterface::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    // ── pin() ───────────────────────────────────────────────

    public function testPinSuccess(): void
    {
        $alice = $this->buildUser(1);
        $bobMentor = $this->buildUser(2, 'Bob');
        $profile   = $this->buildMentorProfile(10, $bobMentor);
        $req       = $this->buildRequest(5, $alice);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn(null);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('persist')->willReturnCallback(
            function (MentoringPin $pin): void {
                // expiresAt est initialisé dans le constructeur, juste injecter l'id
                (new \ReflectionProperty(MentoringPin::class, 'id'))->setValue($pin, 99);
            }
        );
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($bobMentor, $requestRepo, $pinRepo, $mentorRepo, $em)->pin(5);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(99, $payload['id']);
        $this->assertTrue($payload['isActive']);
        $this->assertNotEmpty($payload['expiresAt']);
    }

    public function testPinReturns404WhenRequestNotFound(): void
    {
        $bob = $this->buildUser(1);
        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn(null);

        $response = $this->makeController($bob, $requestRepo)->pin(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testPinReturns404WhenRequestIsInTerminalStatus(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2);
        $req   = $this->buildRequest(5, $alice);
        $req->setStatus(MentoringRequestStatus::ACCEPTED);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $response = $this->makeController($bob, $requestRepo)->pin(5);

        $this->assertSame(404, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('plus disponible', $payload['error']);
    }

    public function testPinReturns403WhenPrivateRequestTargetsAnotherMentor(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'Bob');
        $carol = $this->buildUser(3, 'Carol');
        $bobProfile   = $this->buildMentorProfile(10, $bob);
        $carolProfile = $this->buildMentorProfile(11, $carol);

        // Demande privée ciblée sur Carol
        $req = $this->buildRequest(5, $alice, isPublic: false, target: $carolProfile);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($bobProfile); // Bob essaye d'épingler

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $response = $this->makeController($bob, $requestRepo, null, $mentorRepo)->pin(5);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testPinReturns403WhenPrivateRequestHasNoTarget(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $bob);

        // Privé mais pas de target → personne ne peut pin
        $req = $this->buildRequest(5, $alice, isPublic: false);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $response = $this->makeController($bob, $requestRepo, null, $mentorRepo)->pin(5);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testPinReturns409WhenAnotherMentorHasActivePin(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'Bob');
        $profile = $this->buildMentorProfile(10, $bob);
        $req     = $this->buildRequest(5, $alice);

        $existingPin = new MentoringPin();

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturnCallback(function (array $criteria) use ($existingPin) {
            // 1er appel : recherche existing pin par n'importe quel mentor → retourne existingPin
            if (!isset($criteria['mentor'])) return $existingPin;
            return null;
        });

        $response = $this->makeController($bob, $requestRepo, $pinRepo, $mentorRepo)->pin(5);

        $this->assertSame(409, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('REQUEST_ALREADY_PINNED', $payload['code']);
    }

    public function testPinReturns409WhenSelfAlreadyPinned(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2, 'Bob');
        $profile = $this->buildMentorProfile(10, $bob);
        $req     = $this->buildRequest(5, $alice);

        $ownPin = new MentoringPin();

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturnCallback(function (array $criteria) use ($ownPin) {
            // 1er appel sans mentor : null (pas de pin global)
            if (!isset($criteria['mentor'])) return null;
            // 2e appel avec mentor → ownPin
            return $ownPin;
        });

        $response = $this->makeController($bob, $requestRepo, $pinRepo, $mentorRepo)->pin(5);

        $this->assertSame(409, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('déjà épinglé', $payload['error']);
    }

    public function testPinReturns409OnUniqueConstraintViolation(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $bob);
        $req     = $this->buildRequest(5, $alice);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn(null);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist');
        $driverException = $this->createMock(DriverException::class);
        $em->method('flush')->willThrowException(new UniqueConstraintViolationException($driverException, null));

        $response = $this->makeController($bob, $requestRepo, $pinRepo, $mentorRepo, $em)->pin(5);

        $this->assertSame(409, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('REQUEST_ALREADY_PINNED', $payload['code']);
    }

    // ── unpin() ─────────────────────────────────────────────

    public function testUnpinSuccess(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $bob);
        $req     = $this->buildRequest(5, $alice);

        $pin = new MentoringPin();
        $pin->setIsActive(true);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn($pin);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($bob, $requestRepo, $pinRepo, $mentorRepo, $em)->unpin(5);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertFalse($pin->isActive());
    }

    public function testUnpinReturns404WhenRequestNotFound(): void
    {
        $bob = $this->buildUser(1);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn(null);

        $response = $this->makeController($bob, $requestRepo)->unpin(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testUnpinReturns404WhenNoActivePin(): void
    {
        $alice = $this->buildUser(1);
        $bob   = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $bob);
        $req     = $this->buildRequest(5, $alice);

        $mentorRepo = $this->createMock(MentorProfileRepository::class);
        $mentorRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $pinRepo = $this->createMock(MentoringPinRepository::class);
        $pinRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($bob, $requestRepo, $pinRepo, $mentorRepo)->unpin(5);

        $this->assertSame(404, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertStringContainsString('Aucun pin actif', $payload['error']);
    }
}
