<?php

namespace App\Tests\Controller;

use App\Controller\AdminGroupSuggestionController;
use App\Entity\GroupSuggestion;
use App\Entity\TechGroup;
use App\Entity\User;
use App\Enum\SuggestionStatus;
use App\Enum\UserRole;
use App\Repository\GroupSuggestionRepository;
use App\Repository\TechGroupRepository;
use App\Repository\TechWatchSourceRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

/**
 * 🎮 Hollow Knight — Tests unitaires AdminGroupSuggestionController
 *
 * TheKnight  = admin authentifié (le chevalier)
 * Hornet     = autre admin
 * Quirrel    = utilisateur ayant soumis une suggestion
 */
class AdminGroupSuggestionControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildAdmin(int $id = 1, string $username = 'TheKnight'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@hallownest.hollow')
            ->setFirstname('The')
            ->setLastname('Knight')
            ->setPassword('VoidHeart')
            ->setRole(UserRole::ROLE_ADMIN);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildUser(int $id = 99, string $username = 'Quirrel'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@hallownest.hollow')
            ->setFirstname('Quirrel')
            ->setLastname('Explorer')
            ->setPassword('mask')
            ->setRole(UserRole::ROLE_USER);

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
        ?GroupSuggestionRepository $suggRepo = null,
        ?TechGroupRepository $groupRepo = null,
        ?TechWatchSourceRepository $watchRepo = null,
        bool $isAdmin = true,
    ): AdminGroupSuggestionController {
        $controller = new AdminGroupSuggestionController(
            $suggRepo  ?? $this->createMock(GroupSuggestionRepository::class),
            $groupRepo ?? $this->createMock(TechGroupRepository::class),
            $watchRepo ?? $this->createMock(TechWatchSourceRepository::class),
        );
        $controller->setContainer($this->makeContainer($currentUser, $isAdmin));

        return $controller;
    }

    private function buildSuggestion(
        int $id,
        SuggestionStatus $status = SuggestionStatus::PENDING,
        ?User $claimedBy = null,
    ): GroupSuggestion {
        $submitter = $this->buildUser();

        $s = new GroupSuggestion();
        $s->setSuggestedBy($submitter);
        $s->setName('Deepnest Dev');
        $s->setDescription('A dark corner of Hallownest');
        $s->setStatus($status);

        if ($claimedBy) {
            $s->setClaimedBy($claimedBy);
            $s->setClaimedAt(new \DateTime());
        }

        $idProp = new \ReflectionProperty(GroupSuggestion::class, 'id');
        $idProp->setValue($s, $id);

        return $s;
    }

    // ======================================================================
    //  list()
    // ======================================================================

    public function testListReturnsSuggestions(): void
    {
        $admin    = $this->buildAdmin();
        $suggRepo = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('findPaginated')->willReturn([
            'items' => [$this->buildSuggestion(1)],
            'total' => 1,
        ]);

        $response = $this->makeController($admin, $suggRepo)->list(new Request());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(1, $payload['total']);
        $this->assertCount(1, $payload['items']);
        $this->assertSame('Deepnest Dev', $payload['items'][0]['name']);
        $this->assertSame('PENDING', $payload['items'][0]['status']);
    }

    public function testListReturnsEmptyWhenNone(): void
    {
        $admin    = $this->buildAdmin();
        $suggRepo = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('findPaginated')->willReturn(['items' => [], 'total' => 0]);

        $response = $this->makeController($admin, $suggRepo)->list(new Request());

        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame(0, $payload['total']);
        $this->assertSame([], $payload['items']);
    }

    public function testListDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->list(new Request());
    }

    // ======================================================================
    //  claim()
    // ======================================================================

    public function testClaimSucceeds(): void
    {
        $admin      = $this->buildAdmin(1);
        $suggestion = $this->buildSuggestion(10, SuggestionStatus::PENDING);
        $suggRepo   = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->with(10)->willReturn($suggestion);
        $suggRepo->expects($this->once())->method('save');

        $response = $this->makeController($admin, $suggRepo)->claim(10);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(SuggestionStatus::IN_PROGRESS, $suggestion->getStatus());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('IN_PROGRESS', $payload['status']);
    }

    public function testClaimReturns404WhenNotFound(): void
    {
        $admin    = $this->buildAdmin();
        $suggRepo = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->willReturn(null);

        $response = $this->makeController($admin, $suggRepo)->claim(999);

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testClaimReturns409WhenAlreadyClaimedByOtherAdmin(): void
    {
        $admin      = $this->buildAdmin(1);
        $otherAdmin = $this->buildAdmin(2, 'Hornet');
        $suggestion = $this->buildSuggestion(5, SuggestionStatus::IN_PROGRESS, $otherAdmin);
        $suggRepo   = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->willReturn($suggestion);

        $response = $this->makeController($admin, $suggRepo)->claim(5);

        $this->assertSame(409, $response->getStatusCode());
    }

    public function testClaimDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->claim(1);
    }

    // ======================================================================
    //  approve()
    // ======================================================================

    public function testApproveCreatesGroupAndMarksSuggestion(): void
    {
        $admin      = $this->buildAdmin(1);
        $suggestion = $this->buildSuggestion(7, SuggestionStatus::IN_PROGRESS, $admin);
        $suggRepo   = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->with(7)->willReturn($suggestion);
        $suggRepo->expects($this->once())->method('save');

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->expects($this->once())->method('save')->willReturnCallback(function (TechGroup $g) {
            $idProp = new \ReflectionProperty(TechGroup::class, 'id');
            $idProp->setValue($g, 100);
        });

        $request  = new Request(content: json_encode(['name' => 'Deepnest Dev', 'description' => 'Desc']));
        $response = $this->makeController($admin, $suggRepo, $groupRepo)->approve(7, $request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(SuggestionStatus::APPROVED, $suggestion->getStatus());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('APPROVED', $payload['status']);
        $this->assertSame('Deepnest Dev', $payload['groupName']);
    }

    public function testApproveCreatesRssSourceWhenProvided(): void
    {
        $admin      = $this->buildAdmin(1);
        $suggestion = $this->buildSuggestion(7, SuggestionStatus::IN_PROGRESS, $admin);
        $suggRepo   = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->willReturn($suggestion);

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $groupRepo->method('save')->willReturnCallback(function (TechGroup $g) {
            $idProp = new \ReflectionProperty(TechGroup::class, 'id');
            $idProp->setValue($g, 100);
        });

        $watchRepo = $this->createMock(TechWatchSourceRepository::class);
        $watchRepo->expects($this->once())->method('save');

        $request = new Request(content: json_encode([
            'name'       => 'Deepnest Dev',
            'rssFeedUrl' => 'https://deepnest.dev/feed.xml',
        ]));
        $response = $this->makeController($admin, $suggRepo, $groupRepo, $watchRepo)->approve(7, $request);

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testApproveUsesOriginalNameWhenPayloadEmpty(): void
    {
        $admin      = $this->buildAdmin(1);
        $suggestion = $this->buildSuggestion(7, SuggestionStatus::IN_PROGRESS, $admin);
        $suggRepo   = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->willReturn($suggestion);

        $groupRepo = $this->createMock(TechGroupRepository::class);
        $createdGroup = null;
        $groupRepo->method('save')->willReturnCallback(function (TechGroup $g) use (&$createdGroup) {
            $createdGroup = $g;
            $idProp = new \ReflectionProperty(TechGroup::class, 'id');
            $idProp->setValue($g, 42);
        });

        // Empty payload → should fallback to suggestion->getName()
        $request  = new Request(content: json_encode([]));
        $this->makeController($admin, $suggRepo, $groupRepo)->approve(7, $request);

        $this->assertSame('Deepnest Dev', $createdGroup?->getName());
    }

    public function testApproveReturns404WhenNotFound(): void
    {
        $admin    = $this->buildAdmin();
        $suggRepo = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->willReturn(null);

        $response = $this->makeController($admin, $suggRepo)->approve(999, new Request());

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testApproveReturns409WhenNotClaimedByCurrentAdmin(): void
    {
        $admin      = $this->buildAdmin(1);
        $otherAdmin = $this->buildAdmin(2, 'Hornet');
        $suggestion = $this->buildSuggestion(7, SuggestionStatus::IN_PROGRESS, $otherAdmin);
        $suggRepo   = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->willReturn($suggestion);

        $response = $this->makeController($admin, $suggRepo)->approve(7, new Request());

        $this->assertSame(409, $response->getStatusCode());
    }

    public function testApproveDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->approve(1, new Request());
    }

    // ======================================================================
    //  reject()
    // ======================================================================

    public function testRejectSucceeds(): void
    {
        $admin      = $this->buildAdmin(1);
        $suggestion = $this->buildSuggestion(8, SuggestionStatus::IN_PROGRESS, $admin);
        $suggRepo   = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->with(8)->willReturn($suggestion);
        $suggRepo->expects($this->once())->method('save');

        $request  = new Request(content: json_encode(['resolutionNote' => 'Groupe déjà existant.']));
        $response = $this->makeController($admin, $suggRepo)->reject(8, $request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame(SuggestionStatus::REJECTED, $suggestion->getStatus());
        $this->assertSame('Groupe déjà existant.', $suggestion->getResolutionNote());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('REJECTED', $payload['status']);
    }

    public function testRejectReturns422WhenNoteEmpty(): void
    {
        $admin      = $this->buildAdmin(1);
        $suggestion = $this->buildSuggestion(8, SuggestionStatus::IN_PROGRESS, $admin);
        $suggRepo   = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->willReturn($suggestion);

        $request  = new Request(content: json_encode(['resolutionNote' => '   ']));
        $response = $this->makeController($admin, $suggRepo)->reject(8, $request);

        $this->assertSame(422, $response->getStatusCode());
    }

    public function testRejectReturns404WhenNotFound(): void
    {
        $admin    = $this->buildAdmin();
        $suggRepo = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->willReturn(null);

        $response = $this->makeController($admin, $suggRepo)->reject(999, new Request());

        $this->assertSame(404, $response->getStatusCode());
    }

    public function testRejectReturns409WhenNotClaimedByCurrentAdmin(): void
    {
        $admin      = $this->buildAdmin(1);
        $otherAdmin = $this->buildAdmin(2, 'Hornet');
        $suggestion = $this->buildSuggestion(8, SuggestionStatus::IN_PROGRESS, $otherAdmin);
        $suggRepo   = $this->createMock(GroupSuggestionRepository::class);
        $suggRepo->method('find')->willReturn($suggestion);

        $request  = new Request(content: json_encode(['resolutionNote' => 'nope']));
        $response = $this->makeController($admin, $suggRepo)->reject(8, $request);

        $this->assertSame(409, $response->getStatusCode());
    }

    public function testRejectDeniesNonAdmin(): void
    {
        $admin = $this->buildAdmin();
        $this->expectException(AccessDeniedException::class);
        $this->makeController($admin, isAdmin: false)->reject(1, new Request());
    }
}
