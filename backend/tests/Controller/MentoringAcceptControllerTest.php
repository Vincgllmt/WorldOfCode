<?php

namespace App\Tests\Controller;

use App\Controller\MentoringAcceptController;
use App\Entity\MentorProfile;
use App\Entity\MentoringRequest;
use App\Entity\User;
use App\Enum\MentoringRequestStatus;
use App\Enum\MentoringRequestType;
use App\Enum\SessionFormat;
use App\Enum\UserRole;
use App\Repository\MentoringRequestRepository;
use App\Repository\MentorProfileRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MentoringAcceptControllerTest extends TestCase
{
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
        $idProp = new \ReflectionProperty(MentorProfile::class, 'id');
        $idProp->setValue($profile, $id);
        $userProp = new \ReflectionProperty(MentorProfile::class, 'user');
        $userProp->setValue($profile, $user);
        return $profile;
    }

    private function buildRequest(int $id, User $junior): MentoringRequest
    {
        $req = new MentoringRequest();
        $req->setJunior($junior)->setType(MentoringRequestType::DEBUG)
            ->setTitle('Bug PHP')->setTechStack('PHP')->setDescription('...');
        $idProp = new \ReflectionProperty(MentoringRequest::class, 'id');
        $idProp->setValue($req, $id);
        $req->onCreate();
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
        User $mentor,
        ?MentoringRequestRepository $requestRepo = null,
        ?MentorProfileRepository $mentorProfileRepo = null,
        ?EntityManagerInterface $em = null,
    ): MentoringAcceptController {
        $em = $em ?? $this->createMock(EntityManagerInterface::class);
        $controller = new MentoringAcceptController(
            $requestRepo ?? $this->createMock(MentoringRequestRepository::class),
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
            $em,
        );
        $controller->setContainer($this->makeContainer($mentor));
        return $controller;
    }

    public function testAcceptCreatesSessionAndReturns201(): void
    {
        $mentorUser = $this->buildUser(1, 'BobMentor');
        $juniorUser = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $req        = $this->buildRequest(5, $juniorUser);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->with(['user' => $mentorUser])->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->with(5)->willReturn($req);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->exactly(2))->method('persist')
            ->willReturnCallback(function (object $entity): void {
                if ($entity instanceof \App\Entity\MentoringSession) {
                    $entity->onCreate();
                }
            });
        $em->expects($this->once())->method('flush');

        $httpRequest = new Request([], [], [], [], [], [], json_encode(['format' => 'text']));
        $response = $this->makeController($mentorUser, $requestRepo, $mentorProfileRepo, $em)->accept(5, $httpRequest);

        $this->assertSame(201, $response->getStatusCode());
        $this->assertSame(MentoringRequestStatus::ACCEPTED, $req->getStatus());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('text', $payload['format']);
        $this->assertSame('scheduled', $payload['status']);
    }

    public function testAcceptWithConversationId(): void
    {
        $mentorUser = $this->buildUser(1, 'BobMentor');
        $juniorUser = $this->buildUser(2, 'AliceJunior');
        $profile    = $this->buildMentorProfile(10, $mentorUser);
        $req        = $this->buildRequest(5, $juniorUser);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);
        $mentorProfileRepo->method('findOneBy')->willReturn($profile);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist')->willReturnCallback(function (object $entity): void {
            if ($entity instanceof \App\Entity\MentoringSession) {
                $entity->onCreate();
            }
        });
        $em->method('flush');

        $httpRequest = new Request([], [], [], [], [], [], json_encode([
            'format' => 'video',
            'conversationId' => 'conv-xyz',
        ]));
        $response = $this->makeController($mentorUser, $requestRepo, $mentorProfileRepo, $em)->accept(5, $httpRequest);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('video', $payload['format']);
        $this->assertSame('conv-xyz', $payload['conversationId']);
    }

    public function testAcceptReturns409WhenAlreadyAccepted(): void
    {
        $mentorUser = $this->buildUser(1);
        $juniorUser = $this->buildUser(2);
        $req        = $this->buildRequest(5, $juniorUser);
        $req->setStatus(MentoringRequestStatus::ACCEPTED);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn($req);

        $mentorProfileRepo = $this->createMock(MentorProfileRepository::class);

        $httpRequest = new Request([], [], [], [], [], [], json_encode(['format' => 'text']));
        $response = $this->makeController($mentorUser, $requestRepo, $mentorProfileRepo)->accept(5, $httpRequest);

        $this->assertSame(409, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('REQUEST_ALREADY_ACCEPTED', $payload['code']);
    }

    public function testAcceptReturns404WhenNotFound(): void
    {
        $mentorUser  = $this->buildUser(1);
        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('find')->willReturn(null);

        $httpRequest = new Request([], [], [], [], [], [], json_encode(['format' => 'text']));
        $response = $this->makeController($mentorUser, $requestRepo)->accept(99, $httpRequest);

        $this->assertSame(404, $response->getStatusCode());
    }
}
