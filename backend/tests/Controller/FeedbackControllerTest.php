<?php

namespace App\Tests\Controller;

use App\Controller\FeedbackController;
use App\Entity\Feedback;
use App\Entity\User;
use App\Enum\FeedbackStatus;
use App\Enum\UserRole;
use App\Mapper\FeedbackMapper;
use App\Repository\FeedbackRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * 🎮 Hollow Knight - Tests unitaires du FeedbackController
 *
 * Knight    = utilisateur authentifié courant
 * Hornet    = autre utilisateur (contrôle d'accès)
 * Radiance  = administrateur
 */
class FeedbackControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'Knight', bool $isAdmin = false): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@hallownest.bug')
            ->setFirstname($username)
            ->setLastname('Vessel')
            ->setPassword('hashed')
            ->setRole($isAdmin ? UserRole::ROLE_ADMIN : UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildFeedback(User $user, int $id = 1): Feedback
    {
        $feedback = new Feedback();
        $feedback->setUser($user)
            ->setOverallSatisfaction(4)
            ->setEaseOfUse(5)
            ->setContentQuality(3)
            ->setMessagingRating(4)
            ->setGroupsRating(null)
            ->setMentoringRating(null)
            ->setNpsScore(8)
            ->setComment('Hallownest is vast');
        $feedback->onCreate();

        $idProp = new \ReflectionProperty(Feedback::class, 'id');
        $idProp->setValue($feedback, $id);

        return $feedback;
    }

    private function makeContainer(User $currentUser, bool $isAdmin = false): ContainerInterface
    {
        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($currentUser);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturnCallback(
            fn(string $attr) => match ($attr) {
                'ROLE_ADMIN' => $isAdmin,
                default      => true,
            }
        );

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
        ?FeedbackRepository $feedbackRepo = null,
        bool $isAdmin = false
    ): FeedbackController {
        $controller = new FeedbackController(
            $feedbackRepo ?? $this->createMock(FeedbackRepository::class),
            new FeedbackMapper()
        );

        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    private function makeCreateRequest(array $overrides = []): Request
    {
        $data = array_merge([
            'overallSatisfaction' => 4,
            'easeOfUse'          => 5,
            'contentQuality'     => 3,
            'npsScore'           => 8,
        ], $overrides);

        return new Request(content: json_encode($data, JSON_THROW_ON_ERROR));
    }

    // ======================================================================
    //  hasExisting()
    // ======================================================================

    public function testHasExistingReturnsTrueWhenFeedbackExists(): void
    {
        $knight = $this->buildUser(1);
        $feedback = $this->buildFeedback($knight);

        $feedbackRepo = $this->createMock(FeedbackRepository::class);
        $feedbackRepo->method('findOneBy')->willReturn($feedback);

        $response = $this->makeController($knight, $feedbackRepo)->hasExisting();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['hasExisting']);
    }

    public function testHasExistingReturnsFalseWhenNoFeedback(): void
    {
        $knight = $this->buildUser(1);

        $feedbackRepo = $this->createMock(FeedbackRepository::class);
        $feedbackRepo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($knight, $feedbackRepo)->hasExisting();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertFalse($payload['hasExisting']);
    }

    // ======================================================================
    //  create()
    // ======================================================================

    public function testCreateFeedbackSuccess(): void
    {
        $knight = $this->buildUser(1);

        $feedbackRepo = $this->createMock(FeedbackRepository::class);
        $feedbackRepo->expects($this->once())->method('save');

        $request  = $this->makeCreateRequest();
        $response = $this->makeController($knight, $feedbackRepo)->create($request);

        $this->assertSame(201, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertTrue($payload['success']);
    }

    public function testCreateFeedbackSuccessWithAllFields(): void
    {
        $knight = $this->buildUser(1);

        $feedbackRepo = $this->createMock(FeedbackRepository::class);
        $feedbackRepo->expects($this->once())->method('save');

        $request = $this->makeCreateRequest([
            'messagingRating' => 4,
            'groupsRating'    => 5,
            'mentoringRating' => 3,
            'comment'         => 'The Radiance must fall',
        ]);

        $response = $this->makeController($knight, $feedbackRepo)->create($request);

        $this->assertSame(201, $response->getStatusCode());
    }

    public function testCreateFeedbackSuccessWithOnlyRequiredFields(): void
    {
        $knight = $this->buildUser(1);

        $feedbackRepo = $this->createMock(FeedbackRepository::class);
        $feedbackRepo->expects($this->once())->method('save');

        $request = $this->makeCreateRequest([
            'overallSatisfaction' => 3,
            'easeOfUse'          => 2,
            'contentQuality'     => 4,
            'npsScore'           => 6,
        ]);

        $response = $this->makeController($knight, $feedbackRepo)->create($request);

        $this->assertSame(201, $response->getStatusCode());
    }

    public function testCreateFeedbackFailsWhenOverallSatisfactionMissing(): void
    {
        $knight = $this->buildUser(1);

        $request = $this->makeCreateRequest(['overallSatisfaction' => null]);
        // Remove the key entirely
        $data = json_decode($request->getContent(), true);
        unset($data['overallSatisfaction']);
        $request = new Request(content: json_encode($data, JSON_THROW_ON_ERROR));

        $response = $this->makeController($knight)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateFeedbackFailsWhenEaseOfUseMissing(): void
    {
        $knight = $this->buildUser(1);

        $data = ['overallSatisfaction' => 4, 'contentQuality' => 3, 'npsScore' => 8];
        $request = new Request(content: json_encode($data, JSON_THROW_ON_ERROR));

        $response = $this->makeController($knight)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateFeedbackFailsWhenContentQualityMissing(): void
    {
        $knight = $this->buildUser(1);

        $data = ['overallSatisfaction' => 4, 'easeOfUse' => 5, 'npsScore' => 8];
        $request = new Request(content: json_encode($data, JSON_THROW_ON_ERROR));

        $response = $this->makeController($knight)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateFeedbackFailsWhenNpsScoreMissing(): void
    {
        $knight = $this->buildUser(1);

        $data = ['overallSatisfaction' => 4, 'easeOfUse' => 5, 'contentQuality' => 3];
        $request = new Request(content: json_encode($data, JSON_THROW_ON_ERROR));

        $response = $this->makeController($knight)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateFeedbackFailsWhenRatingTooLow(): void
    {
        $knight = $this->buildUser(1);

        $request = $this->makeCreateRequest(['overallSatisfaction' => 0]);
        $response = $this->makeController($knight)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateFeedbackFailsWhenRatingTooHigh(): void
    {
        $knight = $this->buildUser(1);

        $request = $this->makeCreateRequest(['easeOfUse' => 6]);
        $response = $this->makeController($knight)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateFeedbackFailsWhenNpsTooLow(): void
    {
        $knight = $this->buildUser(1);

        $request = $this->makeCreateRequest(['npsScore' => 0]);
        $response = $this->makeController($knight)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateFeedbackFailsWhenNpsTooHigh(): void
    {
        $knight = $this->buildUser(1);

        $request = $this->makeCreateRequest(['npsScore' => 11]);
        $response = $this->makeController($knight)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testCreateFeedbackFailsWhenOptionalRatingOutOfRange(): void
    {
        $knight = $this->buildUser(1);

        $request = $this->makeCreateRequest(['messagingRating' => 7]);
        $response = $this->makeController($knight)->create($request);

        $this->assertSame(400, $response->getStatusCode());
    }

    // ======================================================================
    //  list() — admin only
    // ======================================================================

    public function testListFeedbacksSuccessAsAdmin(): void
    {
        $radiance = $this->buildUser(1, 'Radiance', true);
        $knight   = $this->buildUser(2);

        $feedback1 = $this->buildFeedback($knight, 1);
        $feedback2 = $this->buildFeedback($knight, 2);

        $feedbackRepo = $this->createMock(FeedbackRepository::class);
        $feedbackRepo->method('findBy')->willReturn([$feedback1, $feedback2]);

        $response = $this->makeController($radiance, $feedbackRepo, isAdmin: true)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(2, $payload);
        $this->assertSame(4, $payload[0]['overallSatisfaction']);
        $this->assertSame('Knight', $payload[0]['username']);
    }

    public function testListFeedbacksReturnsEmptyList(): void
    {
        $radiance = $this->buildUser(1, 'Radiance', true);

        $feedbackRepo = $this->createMock(FeedbackRepository::class);
        $feedbackRepo->method('findBy')->willReturn([]);

        $response = $this->makeController($radiance, $feedbackRepo, isAdmin: true)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame([], $payload);
    }

    // ======================================================================
    //  updateStatus() — admin only
    // ======================================================================

    public function testUpdateStatusSuccess(): void
    {
        $radiance = $this->buildUser(1, 'Radiance', true);
        $knight   = $this->buildUser(2);
        $feedback = $this->buildFeedback($knight, 1);

        $feedbackRepo = $this->createMock(FeedbackRepository::class);
        $feedbackRepo->method('find')->with(1)->willReturn($feedback);
        $feedbackRepo->expects($this->once())->method('save')->with($feedback);

        $request  = new Request(content: json_encode(['status' => 'read'], JSON_THROW_ON_ERROR));
        $response = $this->makeController($radiance, $feedbackRepo, isAdmin: true)->updateStatus(1, $request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('read', $payload['status']);
        $this->assertSame(FeedbackStatus::READ, $feedback->getStatus());
    }

    public function testUpdateStatusReturns404WhenNotFound(): void
    {
        $radiance = $this->buildUser(1, 'Radiance', true);

        $feedbackRepo = $this->createMock(FeedbackRepository::class);
        $feedbackRepo->method('find')->willReturn(null);

        $request  = new Request(content: json_encode(['status' => 'read'], JSON_THROW_ON_ERROR));
        $response = $this->makeController($radiance, $feedbackRepo, isAdmin: true)->updateStatus(999, $request);

        $this->assertSame(404, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testUpdateStatusReturns422WhenStatusInvalid(): void
    {
        $radiance = $this->buildUser(1, 'Radiance', true);
        $knight   = $this->buildUser(2);
        $feedback = $this->buildFeedback($knight, 1);

        $feedbackRepo = $this->createMock(FeedbackRepository::class);
        $feedbackRepo->method('find')->willReturn($feedback);

        $request  = new Request(content: json_encode(['status' => 'invalid_status'], JSON_THROW_ON_ERROR));
        $response = $this->makeController($radiance, $feedbackRepo, isAdmin: true)->updateStatus(1, $request);

        $this->assertSame(422, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testUpdateStatusDeniesNonAdmin(): void
    {
        $knight = $this->buildUser(1);
        $this->expectException(AccessDeniedException::class);
        $request = new Request(content: json_encode(['status' => 'read'], JSON_THROW_ON_ERROR));
        $this->makeController($knight, isAdmin: false)->updateStatus(1, $request);
    }
}
