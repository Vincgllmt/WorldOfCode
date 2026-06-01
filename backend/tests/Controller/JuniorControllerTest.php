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

    private function buildSession(int $id, MentorProfile $mentor, User $junior, MentoringSessionStatus $status = MentoringSessionStatus::SCHEDULED): MentoringSession
    {
        $session = new MentoringSession();
        (new \ReflectionProperty(MentoringSession::class, 'id'))->setValue($session, $id);
        $session->setMentor($mentor)->setJunior($junior)->setFormat(SessionFormat::TEXT)->setStatus($status);
        $session->onCreate();
        return $session;
    }

    private function buildRating(int $id, User $ratee, ?int $score, bool $visible): MentoringRating
    {
        $rating = new MentoringRating();
        (new \ReflectionProperty(MentoringRating::class, 'id'))->setValue($rating, $id);
        // ratee setter via reflection si nécessaire, sinon via méthode publique
        $rating->setRater($this->buildUser(99, 'Anon'));
        $rating->setRatee($ratee);
        if ($score !== null) {
            $rating->setScore($score);
        }
        $rating->setIsVisible($visible);
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

    public function testStatsReturnsAggregatedDataWithRatings(): void
    {
        $alice  = $this->buildUser(1);
        $bobMentor   = $this->buildUser(10, 'Bob');
        $carolMentor = $this->buildUser(11, 'Carol');
        $bobProfile   = $this->buildMentorProfile(100, $bobMentor);
        $carolProfile = $this->buildMentorProfile(101, $carolMentor);

        // 3 sessions : 1 SCHEDULED + 1 IN_PROGRESS (= 2 actives) + 1 COMPLETED
        $sessions = [
            $this->buildSession(1, $bobProfile,   $alice, MentoringSessionStatus::SCHEDULED),
            $this->buildSession(2, $bobProfile,   $alice, MentoringSessionStatus::IN_PROGRESS),
            $this->buildSession(3, $carolProfile, $alice, MentoringSessionStatus::COMPLETED),
        ];

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->with(['junior' => $alice])->willReturn($sessions);

        // 3 notes reçues : 2 visibles avec scores, 1 cachée (filtrée)
        $ratings = [
            $this->buildRating(1, $alice, 4, true),
            $this->buildRating(2, $alice, 5, true),
            $this->buildRating(3, $alice, 3, false), // pas visible → ignoré
        ];
        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findBy')->with(['ratee' => $alice])->willReturn($ratings);

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findBy')->with(['junior' => $alice])->willReturn(['r1', 'r2', 'r3', 'r4']); // 4 demandes

        $response = $this->makeController($alice, $sessionRepo, $requestRepo, $ratingRepo)->stats();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(3, $payload['totalSessions']);
        $this->assertSame(2, $payload['activeSessions']);
        $this->assertSame(1, $payload['completedSessions']);
        $this->assertSame(2, $payload['totalMentors']); // 2 mentor IDs uniques
        $this->assertSame(4, $payload['totalRequests']);
        $this->assertSame(4.5, $payload['averageRating']); // (4+5)/2 = 4.5
    }

    public function testStatsReturnsNullAverageWhenNoVisibleRatings(): void
    {
        $alice = $this->buildUser(1);

        $sessionRepo = $this->createMock(MentoringSessionRepository::class);
        $sessionRepo->method('findBy')->willReturn([]);

        $ratingRepo = $this->createMock(MentoringRatingRepository::class);
        $ratingRepo->method('findBy')->willReturn([]); // aucune note

        $requestRepo = $this->createMock(MentoringRequestRepository::class);
        $requestRepo->method('findBy')->willReturn([]);

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
}
