<?php

namespace App\Tests\Controller;

use App\Controller\JuniorController;
use App\Entity\MentorProfile;
use App\Entity\MentoringRating;
use App\Entity\MentoringSession;
use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Enum\SessionFormat;
use App\Enum\UserRole;
use App\Repository\MentoringRatingRepository;
use App\Repository\MentoringRequestRepository;
use App\Repository\MentoringSessionRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class JuniorControllerTest extends TestCase
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
        $idProp  = new \ReflectionProperty(MentorProfile::class, 'id');
        $idProp->setValue($profile, $id);
        $userProp = new \ReflectionProperty(MentorProfile::class, 'user');
        $userProp->setValue($profile, $user);
        $profile->onCreate();
        return $profile;
    }

    private function buildSession(int $id, MentorProfile $mentor, User $junior, MentoringSessionStatus $status = MentoringSessionStatus::SCHEDULED): MentoringSession
    {
        $session = new MentoringSession();
        $session->setMentor($mentor)->setJunior($junior)
            ->setFormat(SessionFormat::TEXT)
            ->setStatus($status);
        $idProp = new \ReflectionProperty(MentoringSession::class, 'id');
        $idProp->setValue($session, $id);
        $session->onCreate();
        return $session;
    }

    private function buildRating(int $id, User $rater, User $ratee, int $score, bool $visible): MentoringRating
    {
        $rating = new MentoringRating();
        $rating->setRater($rater)->setRatee($ratee)->setScore($score)->setIsVisible($visible);
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
        ?MentoringRequestRepository $requestRepo = null,
        ?MentoringRatingRepository $ratingRepo = null,
    ): JuniorController {
        $controller = new JuniorController(
            $sessionRepo ?? $this->createMock(MentoringSessionRepository::class),
            $requestRepo ?? $this->createMock(MentoringRequestRepository::class),
            $ratingRepo  ?? $this->createMock(MentoringRatingRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser));
        return $controller;
    }

    // ======================================================================
    //  stats()
    // ======================================================================

    public function testStatsReturnsZerosWhenNoData(): void
    {
        $alice = $this->buildUser(1);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->with(['junior' => $alice])->willReturn([]);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findBy')->with(['junior' => $alice])->willReturn([]);

        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findBy')->with(['ratee' => $alice])->willReturn([]);

        $response = $this->makeController($alice, $sessionRepo, $requestRepo, $ratingRepo)->stats();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(0, $payload['totalSessions']);
        $this->assertSame(0, $payload['activeSessions']);
        $this->assertSame(0, $payload['completedSessions']);
        $this->assertSame(0, $payload['totalMentors']);
        $this->assertSame(0, $payload['totalRequests']);
        $this->assertNull($payload['averageRating']);
    }

    public function testStatsCountsSessionsByStatus(): void
    {
        $alice      = $this->buildUser(1);
        $mentorUser = $this->buildUser(2, 'Bob');
        $profile    = $this->buildMentorProfile(10, $mentorUser);

        $scheduled  = $this->buildSession(1, $profile, $alice, MentoringSessionStatus::SCHEDULED);
        $inProgress = $this->buildSession(2, $profile, $alice, MentoringSessionStatus::IN_PROGRESS);
        $completed  = $this->buildSession(3, $profile, $alice, MentoringSessionStatus::COMPLETED);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->with(['junior' => $alice])
            ->willReturn([$scheduled, $inProgress, $completed]);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findBy')->willReturn([]);

        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findBy')->willReturn([]);

        $response = $this->makeController($alice, $sessionRepo, $requestRepo, $ratingRepo)->stats();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(3, $payload['totalSessions']);
        $this->assertSame(2, $payload['activeSessions']);
        $this->assertSame(1, $payload['completedSessions']);
        $this->assertSame(1, $payload['totalMentors']);
    }

    public function testStatsComputesAverageRating(): void
    {
        $alice   = $this->buildUser(1);
        $rater1  = $this->buildUser(2, 'Bob');
        $rater2  = $this->buildUser(3, 'Carol');

        $rating1 = $this->buildRating(1, $rater1, $alice, 4, true);
        $rating2 = $this->buildRating(2, $rater2, $alice, 2, true);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->willReturn([]);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findBy')->willReturn([]);

        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findBy')->with(['ratee' => $alice])
            ->willReturn([$rating1, $rating2]);

        $response = $this->makeController($alice, $sessionRepo, $requestRepo, $ratingRepo)->stats();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(3.0, $payload['averageRating']);
    }

    public function testStatsIgnoresInvisibleRatings(): void
    {
        $alice  = $this->buildUser(1);
        $rater  = $this->buildUser(2, 'Bob');

        $visibleRating   = $this->buildRating(1, $rater, $alice, 5, true);
        $invisibleRating = $this->buildRating(2, $rater, $alice, 1, false);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->willReturn([]);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findBy')->willReturn([]);

        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findBy')->willReturn([$visibleRating, $invisibleRating]);

        $response = $this->makeController($alice, $sessionRepo, $requestRepo, $ratingRepo)->stats();

        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(5.0, $payload['averageRating']);
    }

    public function testStatsTotalRequestsCount(): void
    {
        $alice = $this->buildUser(1);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->willReturn([]);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findBy')->with(['junior' => $alice])->willReturn([
            new \stdClass(),
            new \stdClass(),
            new \stdClass(),
        ]);

        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findBy')->willReturn([]);

        $response = $this->makeController($alice, $sessionRepo, $requestRepo, $ratingRepo)->stats();

        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(3, $payload['totalRequests']);
    }
}
