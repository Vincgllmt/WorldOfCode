<?php

namespace App\Tests\Controller;

use App\Controller\AdminStatsController;
use App\Entity\User;
use App\Enum\FeedbackStatus;
use App\Enum\UserRole;
use App\Repository\FeedbackRepository;
use App\Repository\GroupSuggestionRepository;
use App\Repository\PostRepository;
use App\Repository\ReportRepository;
use App\Repository\TechGroupRepository;
use App\Repository\UserRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * 🎮 Outer Wilds — Tests unitaires AdminStatsController
 *
 * Hearthian = admin authentifié (explorateur)
 */
class AdminStatsControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildAdmin(int $id = 1, string $username = 'Hearthian'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@solarsystem.space')
            ->setFirstname('Hearthian')
            ->setLastname('Explorer')
            ->setPassword('SuperNova')
            ->setRole(UserRole::ROLE_ADMIN);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function makeContainer(User $currentUser, bool $isAdmin = true): ContainerInterface
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
        ?UserRepository $userRepo = null,
        ?PostRepository $postRepo = null,
        ?TechGroupRepository $groupRepo = null,
        ?ReportRepository $reportRepo = null,
        ?GroupSuggestionRepository $suggRepo = null,
        ?FeedbackRepository $feedbackRepo = null,
        bool $isAdmin = true,
    ): AdminStatsController {
        $controller = new AdminStatsController(
            $userRepo      ?? $this->createMock(UserRepository::class),
            $postRepo      ?? $this->createMock(PostRepository::class),
            $groupRepo     ?? $this->createMock(TechGroupRepository::class),
            $reportRepo    ?? $this->createMock(ReportRepository::class),
            $suggRepo      ?? $this->createMock(GroupSuggestionRepository::class),
            $feedbackRepo  ?? $this->createMock(FeedbackRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    // ======================================================================
    //  stats()
    // ======================================================================

    public function testStatsReturnsAggregates(): void
    {
        $admin        = $this->buildAdmin();
        $userRepo     = $this->createMock(UserRepository::class);
        $postRepo     = $this->createMock(PostRepository::class);
        $groupRepo    = $this->createMock(TechGroupRepository::class);
        $reportRepo   = $this->createMock(ReportRepository::class);
        $suggRepo     = $this->createMock(GroupSuggestionRepository::class);
        $feedbackRepo = $this->createMock(FeedbackRepository::class);

        $userRepo->method('count')->willReturn(50);
        $postRepo->method('count')->willReturn(200);
        $groupRepo->method('count')->willReturn(10);
        $reportRepo->method('count')->willReturn(3);
        $suggRepo->method('count')->willReturn(5);
        $feedbackRepo->method('count')->willReturn(7);
        $userRepo->method('countSince')->willReturn(8);
        $postRepo->method('countSince')->willReturn(30);
        $groupRepo->method('findTopByActivity')->willReturn([]);

        $response = $this->makeController($admin, $userRepo, $postRepo, $groupRepo, $reportRepo, $suggRepo, $feedbackRepo)->stats();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(50, $payload['totalUsers']);
        $this->assertSame(200, $payload['totalPosts']);
        $this->assertSame(10, $payload['totalGroups']);
        $this->assertSame(5, $payload['pendingGroupSuggestionsCount']);
        $this->assertSame(8, $payload['newUsersThisWeek']);
        $this->assertSame(7, $payload['newFeedbacksCount']);
    }

    public function testStatsDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->stats();
    }

    // ======================================================================
    //  activity()
    // ======================================================================

    public function testActivityReturnsPointsForRange(): void
    {
        $admin    = $this->buildAdmin();
        $userRepo = $this->createMock(UserRepository::class);
        $postRepo = $this->createMock(PostRepository::class);

        $userRepo->method('countByDay')->willReturn(['2024-06-01' => 3]);
        $postRepo->method('countByDay')->willReturn(['2024-06-01' => 10]);

        $request  = new Request(['days' => '1']);
        $response = $this->makeController($admin, $userRepo, $postRepo)->activity($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertNotEmpty($payload);
        $this->assertArrayHasKey('date', $payload[0]);
        $this->assertArrayHasKey('newUsers', $payload[0]);
        $this->assertArrayHasKey('newPosts', $payload[0]);
    }

    public function testActivityClampsToMax90Days(): void
    {
        $admin    = $this->buildAdmin();
        $userRepo = $this->createMock(UserRepository::class);
        $postRepo = $this->createMock(PostRepository::class);
        $userRepo->method('countByDay')->willReturn([]);
        $postRepo->method('countByDay')->willReturn([]);

        $request  = new Request(['days' => '999']);
        $response = $this->makeController($admin, $userRepo, $postRepo)->activity($request);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        // 91 points max (day 0 → day 90 inclusive)
        $this->assertLessThanOrEqual(91, count($payload));
    }

    public function testActivityDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->activity(new Request());
    }

    // ======================================================================
    //  recentActivity()
    // ======================================================================

    public function testRecentActivityReturnsMergedAndSortedEvents(): void
    {
        $admin      = $this->buildAdmin();
        $userRepo   = $this->createMock(UserRepository::class);
        $postRepo   = $this->createMock(PostRepository::class);
        $reportRepo = $this->createMock(ReportRepository::class);

        $userInst = $this->buildAdmin(2, 'NewUser');
        $userRepo->method('findBy')->willReturn([$userInst]);

        $postUser = $this->buildAdmin(3, 'PostAuthor');
        $post = $this->createMock(\App\Entity\Post::class);
        $post->method('getContent')->willReturn('Some post content');
        $post->method('getAuthor')->willReturn($postUser);
        $post->method('getCreatedAt')->willReturn(new \DateTime('-1 hour'));
        $postRepo->method('findBy')->willReturn([$post]);

        $reportUser = $this->buildAdmin(4, 'Reporter');
        $report = $this->createMock(\App\Entity\Report::class);
        $report->method('getUser')->willReturn($reportUser);
        $report->method('getCreatedAt')->willReturn(new \DateTime('-2 hours'));
        $reportRepo->method('findBy')->willReturn([$report]);

        $response = $this->makeController($admin, $userRepo, $postRepo, reportRepo: $reportRepo)->recentActivity();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertNotEmpty($payload);
        $this->assertContains($payload[0]['type'], ['new_user', 'new_post', 'new_report']);
    }

    public function testRecentActivityTruncatesLongPostContent(): void
    {
        $admin      = $this->buildAdmin();
        $userRepo   = $this->createMock(UserRepository::class);
        $postRepo   = $this->createMock(PostRepository::class);
        $reportRepo = $this->createMock(ReportRepository::class);

        $userRepo->method('findBy')->willReturn([]);

        // Contenu > 50 caractères → doit déclencher la branche de troncature
        $longContent = str_repeat('a', 80);
        $postUser = $this->buildAdmin(3, 'LongPoster');
        $post = $this->createMock(\App\Entity\Post::class);
        $post->method('getContent')->willReturn($longContent);
        $post->method('getAuthor')->willReturn($postUser);
        $post->method('getCreatedAt')->willReturn(new \DateTime('-1 hour'));
        $postRepo->method('findBy')->willReturn([$post]);

        $reportRepo->method('findBy')->willReturn([]);

        $response = $this->makeController($admin, $userRepo, $postRepo, reportRepo: $reportRepo)->recentActivity();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        // L'excerpt doit être tronqué à 50 chars + ellipsis
        $postEvent = array_values(array_filter($payload, fn($e) => $e['type'] === 'new_post'))[0] ?? null;
        $this->assertNotNull($postEvent);
        $this->assertStringEndsWith('…', $postEvent['excerpt']);
        $this->assertSame(51, mb_strlen($postEvent['excerpt'])); // 50 + 1 ellipsis
    }

    public function testRecentActivityDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->recentActivity();
    }
}
