<?php

namespace App\Tests\Controller;

use App\Controller\AdminReportController;
use App\Dto\AdminReportDto;
use App\Entity\Post;
use App\Entity\Report;
use App\Entity\User;
use App\Enum\ReportStatus;
use App\Enum\UserRole;
use App\Mapper\AdminReportMapper;
use App\Repository\PostRepository;
use App\Repository\ReportRepository;
use App\Service\NotificationService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * 🎮 Disco Elysium — Tests unitaires AdminReportController
 *
 * HarryDubois = admin authentifié (détective)
 * KimKitsuragi = autre admin
 */
class AdminReportControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildAdmin(int $id = 1, string $username = 'HarryDubois'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@revachol.rcu')
            ->setFirstname('Harry')
            ->setLastname('Dubois')
            ->setPassword('AlcoholicCop')
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
        ?ReportRepository $reportRepo = null,
        ?PostRepository $postRepo = null,
        ?AdminReportMapper $mapper = null,
        bool $isAdmin = true,
    ): AdminReportController {
        $controller = new AdminReportController(
            $reportRepo           ?? $this->createMock(ReportRepository::class),
            $postRepo             ?? $this->createMock(PostRepository::class),
            $mapper               ?? $this->createMock(AdminReportMapper::class),
            $this->createMock(NotificationService::class),
        );
        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    private function buildReport(int $id, ReportStatus $status = ReportStatus::PENDING, ?User $claimedBy = null): Report
    {
        $reporter = new User();
        $reporter->setUsername('reporter')->setEmail('r@test.fr')
            ->setFirstname('R')->setLastname('R')->setPassword('x')->setRole(UserRole::ROLE_USER);

        $report = new Report();
        $report->setUser($reporter);
        $report->setStatus($status);
        if ($claimedBy) {
            $report->setClaimedBy($claimedBy);
            $report->setClaimedAt(new \DateTime());
        }

        $idProp = new \ReflectionProperty(Report::class, 'id');
        $idProp->setValue($report, $id);

        return $report;
    }

    private function buildPost(int $id, ?User $author = null): Post
    {
        $post = new Post();
        $post->onCreate();

        $idProp = new \ReflectionProperty(Post::class, 'id');
        $idProp->setValue($post, $id);

        if ($author) {
            $post->setAuthor($author);
        } else {
            // résout "Typed property Post::$author must not be accessed before initialization"
            // dans la logique de notification du resolve()
            $postAuthor = new User();
            $postAuthor->setUsername('PostAuthor')->setEmail('pa@woc.dev')
                ->setFirstname('Post')->setLastname('Author')
                ->setPassword('hash')->setRole(UserRole::ROLE_USER);
            (new \ReflectionProperty(User::class, 'id'))->setValue($postAuthor, $id + 1000);
            $postAuthor->onCreate();
            $post->setAuthor($postAuthor);
        }

        return $post;
    }

    private function buildDto(int $id): AdminReportDto
    {
        return new AdminReportDto(
            id: $id,
            postId: null, postExcerpt: null, postContent: null, postAuthorUsername: null,
            postAuthorId: null, postTechGroupName: null, postLikesCount: null, postCommentsCount: null,
            reportedByUsername: 'reporter', reason: null,
            createdAt: (new \DateTime())->format(\DateTimeInterface::ATOM),
            status: 'PENDING',
            claimedByUsername: null, claimedAt: null,
            resolvedByUsername: null, resolvedAt: null, resolutionNote: null,
        );
    }

    // ======================================================================
    //  listGroupedByPost()
    // ======================================================================

    public function testListGroupedByPostReturnsData(): void
    {
        $admin      = $this->buildAdmin();
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('findGroupedByPost')->willReturn([
            'items' => [
                [
                    'postId'          => 42,
                    'postContent'     => 'Contenu du post signalé',
                    'reportCount'     => 3,
                    'pendingCount'    => 2,
                    'inProgressCount' => 1,
                    'resolvedCount'   => 0,
                    'rejectedCount'   => 0,
                    'latestReportAt'  => '2024-06-01T10:00:00+00:00',
                ],
            ],
            'total' => 1,
        ]);

        $response = $this->makeController($admin, $reportRepo)->listGroupedByPost(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(1, $payload['total']);
        $this->assertCount(1, $payload['items']);
        $this->assertSame(42, $payload['items'][0]['postId']);
        $this->assertSame(3, $payload['items'][0]['reportCount']);
    }

    public function testListGroupedByPostReturnsEmptyWhenNone(): void
    {
        $admin      = $this->buildAdmin();
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('findGroupedByPost')->willReturn(['items' => [], 'total' => 0]);

        $response = $this->makeController($admin, $reportRepo)->listGroupedByPost(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(0, $payload['total']);
        $this->assertSame([], $payload['items']);
    }

    public function testListGroupedByPostDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->listGroupedByPost(new Request());
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsReports(): void
    {
        $admin      = $this->buildAdmin();
        $reportRepo = $this->createMock(ReportRepository::class);
        $mapper     = $this->createMock(AdminReportMapper::class);

        $report = $this->buildReport(1);
        $reportRepo->method('findPaginatedWithFilters')->willReturn(['items' => [$report], 'total' => 1]);
        $mapper->method('toDto')->willReturn($this->buildDto(1));

        $response = $this->makeController($admin, $reportRepo, mapper: $mapper)->list(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(1, $payload['total']);
        $this->assertCount(1, $payload['items']);
    }

    public function testListPassesStatusFilterToRepo(): void
    {
        $admin      = $this->buildAdmin();
        $reportRepo = $this->createMock(ReportRepository::class);
        $mapper     = $this->createMock(AdminReportMapper::class);
        $mapper->method('toDto')->willReturn($this->buildDto(1));

        $reportRepo->expects($this->once())
            ->method('findPaginatedWithFilters')
            ->with(
                $this->equalTo(1),
                $this->equalTo(20),
                $this->equalTo('PENDING'),
                $this->anything(),
                $this->anything(),
                $this->anything(),
                $this->anything(),
                $this->anything(),
                $this->anything(),
                $this->anything(),
            )
            ->willReturn(['items' => [], 'total' => 0]);

        $request = new Request(['status' => 'PENDING']);
        $this->makeController($admin, $reportRepo, mapper: $mapper)->list($request);
    }

    public function testListPassesPostIdFilterToRepo(): void
    {
        $admin      = $this->buildAdmin();
        $reportRepo = $this->createMock(ReportRepository::class);
        $mapper     = $this->createMock(AdminReportMapper::class);
        $mapper->method('toDto')->willReturn($this->buildDto(1));

        $captured = null;
        $reportRepo->method('findPaginatedWithFilters')
            ->willReturnCallback(function () use (&$captured) {
                $captured = func_get_args();
                return ['items' => [], 'total' => 0];
            });

        $request = new Request(['postId' => '99']);
        $this->makeController($admin, $reportRepo, mapper: $mapper)->list($request);

        // postId is the last named param — verify it was passed as int 99
        $this->assertSame(99, $captured[9] ?? null);
    }

    public function testListDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->list(new Request());
    }

    // ======================================================================
    //  claimByPost()
    // ======================================================================

    public function testClaimByPostSucceeds(): void
    {
        $admin   = $this->buildAdmin(1);
        $report1 = $this->buildReport(10, ReportStatus::PENDING);
        $report2 = $this->buildReport(11, ReportStatus::PENDING);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $reportRepo = new class($em, $report1, $report2) extends ReportRepository {
            public function __construct(
                private EntityManagerInterface $testEm,
                private Report $r1,
                private Report $r2,
            ) {}

            public function findPendingByPostId(int $postId): array
            {
                return [$this->r1, $this->r2];
            }

            public function save(Report $r, bool $flush = true): void {}

            public function getEntityManager(): EntityManagerInterface
            {
                return $this->testEm;
            }
        };

        $response = $this->makeController($admin, $reportRepo)->claimByPost(42);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(2, $payload['claimed']);

        $this->assertSame(ReportStatus::IN_PROGRESS, $report1->getStatus());
        $this->assertSame(1, $report1->getClaimedBy()?->getId());
        $this->assertSame(ReportStatus::IN_PROGRESS, $report2->getStatus());
        $this->assertSame(1, $report2->getClaimedBy()?->getId());
    }

    public function testClaimByPostReturns404WhenNoPending(): void
    {
        $admin      = $this->buildAdmin();
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('findPendingByPostId')->willReturn([]);

        $response = $this->makeController($admin, $reportRepo)->claimByPost(99);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testClaimByPostDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->claimByPost(1);
    }

    // ======================================================================
    //  claim()
    // ======================================================================

    public function testClaimSucceeds(): void
    {
        $admin      = $this->buildAdmin(1);
        $report     = $this->buildReport(10, ReportStatus::PENDING);
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('find')->with(10)->willReturn($report);
        $mapper = $this->createMock(AdminReportMapper::class);
        $mapper->method('toDto')->willReturn($this->buildDto(10));

        $response = $this->makeController($admin, $reportRepo, mapper: $mapper)->claim(10);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(ReportStatus::IN_PROGRESS, $report->getStatus());
    }

    public function testClaimReturns404WhenNotFound(): void
    {
        $admin      = $this->buildAdmin();
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('find')->willReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->makeController($admin, $reportRepo)->claim(999);
    }

    public function testClaimReturns409WhenAlreadyClaimedByOtherAdmin(): void
    {
        $admin      = $this->buildAdmin(1);
        $otherAdmin = $this->buildAdmin(2, 'KimKitsuragi');
        $report     = $this->buildReport(5, ReportStatus::IN_PROGRESS, $otherAdmin);
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('find')->willReturn($report);

        $response = $this->makeController($admin, $reportRepo)->claim(5);

        $this->assertSame(409, $response->getStatusCode());
    }

    public function testClaimReturns409WhenNotPending(): void
    {
        $admin      = $this->buildAdmin(1);
        $report     = $this->buildReport(5, ReportStatus::RESOLVED);
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('find')->willReturn($report);

        $response = $this->makeController($admin, $reportRepo)->claim(5);

        $this->assertSame(409, $response->getStatusCode());
    }

    public function testClaimDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->claim(1);
    }

    // ======================================================================
    //  resolve()
    // ======================================================================

    public function testResolveSucceeds(): void
    {
        $admin  = $this->buildAdmin(1);
        $report = $this->buildReport(7, ReportStatus::IN_PROGRESS, $admin);
        $mapper = $this->createMock(AdminReportMapper::class);
        $mapper->method('toDto')->willReturn($this->buildDto(7));

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('wrapInTransaction')->willReturnCallback(fn(callable $cb) => $cb());

        $reportRepo = new class($em, $report) extends ReportRepository {
            public function __construct(
                private EntityManagerInterface $testEm,
                private Report $testReport,
            ) { /* skip parent */ }

            public function find(mixed $id, mixed $lockMode = null, mixed $lockVersion = null): ?object
            {
                return $this->testReport;
            }

            public function save(Report $r, bool $flush = true): void {}

            public function getEntityManager(): EntityManagerInterface
            {
                return $this->testEm;
            }
        };

        $request  = new Request(content: json_encode(['resolutionNote' => 'Post violating ToS']));
        $response = $this->makeController($admin, $reportRepo, mapper: $mapper)->resolve(7, $request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(ReportStatus::RESOLVED, $report->getStatus());
    }

    public function testResolveAutoResolvesSiblingReports(): void
    {
        $admin         = $this->buildAdmin(1);
        $post          = $this->buildPost(42);
        $report        = $this->buildReport(7, ReportStatus::IN_PROGRESS, $admin);
        $siblingReport = $this->buildReport(8, ReportStatus::PENDING);
        $report->setPost($post);

        $mapper = $this->createMock(AdminReportMapper::class);
        $mapper->method('toDto')->willReturn($this->buildDto(7));

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('wrapInTransaction')->willReturnCallback(fn(callable $cb) => $cb());

        $postRepo = $this->createMock(PostRepository::class);
        $postRepo->expects($this->once())->method('remove')->with($post);

        $reportRepo = new class($em, $report, $siblingReport) extends ReportRepository {
            public function __construct(
                private EntityManagerInterface $testEm,
                private Report $testReport,
                private Report $testSibling,
            ) {}

            public function find(mixed $id, mixed $lockMode = null, mixed $lockVersion = null): ?object
            {
                return $this->testReport;
            }

            public function findByPostId(int $postId): array
            {
                return [$this->testReport, $this->testSibling];
            }

            public function save(Report $r, bool $flush = true): void {}

            public function getEntityManager(): EntityManagerInterface
            {
                return $this->testEm;
            }
        };

        $request  = new Request(content: json_encode(['resolutionNote' => 'Contenu supprimé']));
        $response = $this->makeController($admin, $reportRepo, $postRepo, $mapper)->resolve(7, $request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(ReportStatus::RESOLVED, $report->getStatus());
        $this->assertSame(ReportStatus::RESOLVED, $siblingReport->getStatus());
    }

    public function testResolveSkipsAlreadyResolvedOrRejectedSiblings(): void
    {
        $admin           = $this->buildAdmin(1);
        $post            = $this->buildPost(42);
        $report          = $this->buildReport(7, ReportStatus::IN_PROGRESS, $admin);
        $alreadyResolved = $this->buildReport(8, ReportStatus::RESOLVED);
        $alreadyRejected = $this->buildReport(9, ReportStatus::REJECTED);
        $report->setPost($post);

        $mapper = $this->createMock(AdminReportMapper::class);
        $mapper->method('toDto')->willReturn($this->buildDto(7));

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('wrapInTransaction')->willReturnCallback(fn(callable $cb) => $cb());

        $postRepo = $this->createMock(PostRepository::class);

        $reportRepo = new class($em, $report, $alreadyResolved, $alreadyRejected) extends ReportRepository {
            public function __construct(
                private EntityManagerInterface $testEm,
                private Report $testReport,
                private Report $testResolved,
                private Report $testRejected,
            ) {}

            public function find(mixed $id, mixed $lockMode = null, mixed $lockVersion = null): ?object
            {
                return $this->testReport;
            }

            public function findByPostId(int $postId): array
            {
                return [$this->testReport, $this->testResolved, $this->testRejected];
            }

            public function save(Report $r, bool $flush = true): void {}

            public function getEntityManager(): EntityManagerInterface
            {
                return $this->testEm;
            }
        };

        $request = new Request(content: json_encode(['resolutionNote' => 'ok']));
        $this->makeController($admin, $reportRepo, $postRepo, $mapper)->resolve(7, $request);

        // Already-settled reports must not change status
        $this->assertSame(ReportStatus::RESOLVED, $alreadyResolved->getStatus());
        $this->assertSame(ReportStatus::REJECTED, $alreadyRejected->getStatus());
    }

    public function testResolveReturns403WhenNotClaimer(): void
    {
        $admin      = $this->buildAdmin(1);
        $otherAdmin = $this->buildAdmin(2, 'KimKitsuragi');
        $report     = $this->buildReport(7, ReportStatus::IN_PROGRESS, $otherAdmin);
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('find')->willReturn($report);

        $request  = new Request();
        $response = $this->makeController($admin, $reportRepo)->resolve(7, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testResolveReturns404WhenNotFound(): void
    {
        $admin      = $this->buildAdmin();
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('find')->willReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->makeController($admin, $reportRepo)->resolve(999, new Request());
    }

    public function testResolveDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->resolve(1, new Request());
    }

    // ======================================================================
    //  reject()
    // ======================================================================

    public function testRejectSucceeds(): void
    {
        $admin      = $this->buildAdmin(1);
        $report     = $this->buildReport(8, ReportStatus::IN_PROGRESS, $admin);
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('find')->willReturn($report);
        $mapper = $this->createMock(AdminReportMapper::class);
        $mapper->method('toDto')->willReturn($this->buildDto(8));

        $request  = new Request(content: json_encode(['resolutionNote' => 'Not a violation']));
        $response = $this->makeController($admin, $reportRepo, mapper: $mapper)->reject(8, $request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(ReportStatus::REJECTED, $report->getStatus());
    }

    public function testRejectReturns400WhenNoteEmpty(): void
    {
        $admin      = $this->buildAdmin(1);
        $report     = $this->buildReport(8, ReportStatus::IN_PROGRESS, $admin);
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('find')->willReturn($report);

        $request  = new Request(content: json_encode(['resolutionNote' => '  ']));
        $response = $this->makeController($admin, $reportRepo)->reject(8, $request);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testRejectReturns403WhenNotClaimer(): void
    {
        $admin      = $this->buildAdmin(1);
        $otherAdmin = $this->buildAdmin(2, 'KimKitsuragi');
        $report     = $this->buildReport(8, ReportStatus::IN_PROGRESS, $otherAdmin);
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('find')->willReturn($report);

        $request  = new Request(content: json_encode(['resolutionNote' => 'nope']));
        $response = $this->makeController($admin, $reportRepo)->reject(8, $request);

        $this->assertSame(403, $response->getStatusCode());
    }

    public function testRejectReturns404WhenNotFound(): void
    {
        $admin      = $this->buildAdmin();
        $reportRepo = $this->createMock(ReportRepository::class);
        $reportRepo->method('find')->willReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->makeController($admin, $reportRepo)->reject(999, new Request());
    }

    public function testRejectDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->reject(1, new Request());
    }
}
