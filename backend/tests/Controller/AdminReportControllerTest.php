<?php

namespace App\Tests\Controller;

use App\Controller\AdminReportController;
use App\Dto\AdminReportDto;
use App\Entity\Report;
use App\Entity\User;
use App\Enum\ReportStatus;
use App\Enum\UserRole;
use App\Mapper\AdminReportMapper;
use App\Repository\PostRepository;
use App\Repository\ReportRepository;
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
            $reportRepo ?? $this->createMock(ReportRepository::class),
            $postRepo   ?? $this->createMock(PostRepository::class),
            $mapper     ?? $this->createMock(AdminReportMapper::class),
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
    //  list()
    // ======================================================================

    public function testListReturnsReports(): void
    {
        $admin      = $this->buildAdmin();
        $reportRepo = $this->createMock(ReportRepository::class);
        $mapper     = $this->createMock(AdminReportMapper::class);

        $report = $this->buildReport(1);
        $reportRepo->method('findBy')->willReturn([$report]);
        $mapper->method('toDto')->willReturn($this->buildDto(1));

        $response = $this->makeController($admin, $reportRepo, mapper: $mapper)->list();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertCount(1, $payload);
    }

    public function testListDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->list();
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

        // Anonymous subclass to bypass ServiceEntityRepositoryProxy
        $reportRepo = new class($em, $report) extends ReportRepository {
            public function __construct(
                private EntityManagerInterface $testEm,
                private Report $testReport,
            ) { /* skip parent */ }

            public function find(mixed $id, mixed $lockMode = null, mixed $lockVersion = null): ?object
            {
                return $this->testReport;
            }

            public function save(Report $r, bool $flush = true): void { /* no-op */ }

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
