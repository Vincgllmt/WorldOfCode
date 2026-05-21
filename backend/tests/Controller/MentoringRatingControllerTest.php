<?php

namespace App\Tests\Controller;

use App\Controller\MentoringRatingController;
use App\Entity\MentorProfile;
use App\Entity\MentoringRating;
use App\Entity\MentoringSession;
use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Enum\SessionFormat;
use App\Enum\UserRole;
use App\Repository\MentoringRatingRepository;
use App\Repository\MentoringSessionRepository;
use App\Service\Mentoring\MentoringRatingService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class MentoringRatingControllerTest extends TestCase
{
    private function buildUser(int $id, string $username = 'User'): User
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
        $session->setMentor($mentor)->setJunior($junior)
            ->setFormat(SessionFormat::TEXT)
            ->setStatus(MentoringSessionStatus::COMPLETED)
            ->setCompletedAt(new \DateTime());
        $idProp = new \ReflectionProperty(MentoringSession::class, 'id');
        $idProp->setValue($session, $id);
        $session->onCreate();
        return $session;
    }

    private function buildRating(int $id, MentoringSession $session, User $rater, User $ratee): MentoringRating
    {
        $rating = new MentoringRating();
        $rating->setSession($session)->setRater($rater)->setRatee($ratee)->setScore(0);
        $idProp = new \ReflectionProperty(MentoringRating::class, 'id');
        $idProp->setValue($rating, $id);
        $rating->onCreate();
        return $rating;
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
        ?MentoringSessionRepository $sessionRepo = null,
        ?MentoringRatingRepository $ratingRepo = null,
        ?MentoringRatingService $ratingService = null,
    ): MentoringRatingController {
        $controller = new MentoringRatingController(
            $sessionRepo ?? $this->createMock(MentoringSessionRepository::class),
            $ratingRepo  ?? $this->createMock(MentoringRatingRepository::class),
            $ratingService ?? $this->createMock(MentoringRatingService::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    // ── submitRating ────────────────────────────────────

    public function testSubmitRatingReturns200(): void
    {
        $mentor  = $this->buildUser(1, 'MentorBob');
        $junior  = $this->buildUser(2, 'JuniorAlice');
        $profile = $this->buildMentorProfile(10, $mentor);
        $session = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $ratingService = $this->createMock(MentoringRatingService::class);
        $ratingService->expects($this->once())->method('submit')
            ->with($session, $mentor, 4, 'Très bien');

        $httpRequest = new Request([], [], [], [], [], [], json_encode(['score' => 4, 'comment' => 'Très bien']));
        $response = $this->makeController($mentor, $sessionRepo, null, $ratingService)->submitRating(5, $httpRequest);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testSubmitRatingReturns422WhenScoreInvalid(): void
    {
        $mentor  = $this->buildUser(1);
        $junior  = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $mentor);
        $session = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $httpRequest = new Request([], [], [], [], [], [], json_encode(['score' => 0]));
        $response = $this->makeController($mentor, $sessionRepo)->submitRating(5, $httpRequest);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testSubmitRatingReturns409WhenAlreadySubmitted(): void
    {
        $mentor  = $this->buildUser(1);
        $junior  = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $mentor);
        $session = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $ratingService = $this->createMock(MentoringRatingService::class);
        $ratingService->method('submit')->willThrowException(new \LogicException('ALREADY_SUBMITTED'));

        $httpRequest = new Request([], [], [], [], [], [], json_encode(['score' => 3]));
        $response = $this->makeController($mentor, $sessionRepo, null, $ratingService)->submitRating(5, $httpRequest);

        $this->assertSame(409, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('RATING_ALREADY_SUBMITTED', $payload['code']);
    }

    public function testSubmitRatingReturns422WhenDeadlineExpired(): void
    {
        $mentor  = $this->buildUser(1);
        $junior  = $this->buildUser(2);
        $profile = $this->buildMentorProfile(10, $mentor);
        $session = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $ratingService = $this->createMock(MentoringRatingService::class);
        $ratingService->method('submit')->willThrowException(new \LogicException('DEADLINE_EXPIRED'));

        $httpRequest = new Request([], [], [], [], [], [], json_encode(['score' => 3]));
        $response = $this->makeController($mentor, $sessionRepo, null, $ratingService)->submitRating(5, $httpRequest);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testSubmitRatingReturns404WhenSessionNotFound(): void
    {
        $mentor = $this->buildUser(1);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn(null);

        $httpRequest = new Request([], [], [], [], [], [], json_encode(['score' => 4]));
        $response = $this->makeController($mentor, $sessionRepo)->submitRating(999, $httpRequest);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testSubmitRatingReturns403WhenUserIsNotParticipant(): void
    {
        $mentor  = $this->buildUser(1, 'MentorBob');
        $junior  = $this->buildUser(2, 'JuniorAlice');
        $stranger = $this->buildUser(3, 'StrangerEve');
        $profile = $this->buildMentorProfile(10, $mentor);
        $session = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $httpRequest = new Request([], [], [], [], [], [], json_encode(['score' => 4]));
        $response = $this->makeController($stranger, $sessionRepo)->submitRating(5, $httpRequest);

        $this->assertSame(403, $response->getStatusCode());
    }

    // ── getRatings ─────────────────────────────────────

    public function testGetRatingsPendingWhenOneSubmitted(): void
    {
        $mentor  = $this->buildUser(1, 'MentorBob');
        $junior  = $this->buildUser(2, 'JuniorAlice');
        $profile = $this->buildMentorProfile(10, $mentor);
        $session = $this->buildSession(5, $profile, $junior);

        $rating1 = $this->buildRating(1, $session, $mentor, $junior);
        $rating1->setScore(4)->setSubmittedAt(new \DateTime()); // soumis
        $rating2 = $this->buildRating(2, $session, $junior, $mentor); // non soumis

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);
        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findBy')->willReturn([$rating1, $rating2]);

        $response = $this->makeController($mentor, $sessionRepo, $ratingRepo)->getRatings(5);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('pending', $payload['status']);
        $this->assertSame(1, $payload['submitted']);
        $this->assertSame(2, $payload['total']);
    }

    public function testGetRatingsRevealedWhenBothSubmitted(): void
    {
        $mentor  = $this->buildUser(1, 'MentorBob');
        $junior  = $this->buildUser(2, 'JuniorAlice');
        $profile = $this->buildMentorProfile(10, $mentor);
        $session = $this->buildSession(5, $profile, $junior);

        $rating1 = $this->buildRating(1, $session, $mentor, $junior);
        $rating1->setScore(4)->setSubmittedAt(new \DateTime())->setIsVisible(true);
        $rating2 = $this->buildRating(2, $session, $junior, $mentor);
        $rating2->setScore(5)->setSubmittedAt(new \DateTime())->setIsVisible(true);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);
        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findBy')->willReturn([$rating1, $rating2]);

        $response = $this->makeController($mentor, $sessionRepo, $ratingRepo)->getRatings(5);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('complete', $payload['status']);
        $this->assertCount(2, $payload['ratings']);
        $this->assertSame(4, $payload['ratings'][0]['score']);
        $this->assertSame(5, $payload['ratings'][1]['score']);
    }

    public function testGetRatingsReturns404WhenSessionNotFound(): void
    {
        $mentor = $this->buildUser(1);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn(null);

        $response = $this->makeController($mentor, $sessionRepo)->getRatings(999);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testGetRatingsReturns403WhenUserIsNotParticipant(): void
    {
        $mentor   = $this->buildUser(1, 'MentorBob');
        $junior   = $this->buildUser(2, 'JuniorAlice');
        $stranger = $this->buildUser(3, 'StrangerEve');
        $profile  = $this->buildMentorProfile(10, $mentor);
        $session  = $this->buildSession(5, $profile, $junior);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('find')->willReturn($session);

        $response = $this->makeController($stranger, $sessionRepo)->getRatings(5);

        $this->assertSame(403, $response->getStatusCode());
    }
}
