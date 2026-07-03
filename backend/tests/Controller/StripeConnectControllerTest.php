<?php

namespace App\Tests\Controller;

use App\Controller\StripeConnectController;
use App\Entity\MentorProfile;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\MentorProfileRepository;
use App\Service\StripeConnectService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Persona 5 — Tests unitaires du StripeConnectController
 *
 * JokerRen     = mentor authentifié (le voleur de cœurs, maître de l'onboarding)
 * MorganaThief = utilisateur sans profil mentor
 */
class StripeConnectControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id, string $username = 'JokerRen'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@metaverse.jp')
            ->setFirstname($username)
            ->setLastname('Phantom')
            ->setPassword('Arsene!Trickster5')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function buildMentorProfile(User $user, ?string $stripeAccountId = null, bool $transfersEnabled = false): MentorProfile
    {
        $profile = new MentorProfile();
        $profile->setUser($user);

        if ($stripeAccountId !== null) {
            $profile->setStripeAccountId($stripeAccountId);
        }

        $profile->setStripeTransfersEnabled($transfersEnabled);

        return $profile;
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
        ?StripeConnectService $connectService = null,
        ?MentorProfileRepository $mentorProfileRepo = null,
        ?EntityManagerInterface $em = null,
        bool $isGranted = true,
    ): StripeConnectController {
        $controller = new StripeConnectController(
            $connectService    ?? $this->createMock(StripeConnectService::class),
            $mentorProfileRepo ?? $this->createMock(MentorProfileRepository::class),
            $em                ?? $this->createMock(EntityManagerInterface::class),
        );

        $controller->setContainer($this->makeContainer($currentUser, $isGranted));

        return $controller;
    }

    // ======================================================================
    //  onboard() — cas nominal
    // ======================================================================

    public function testOnboardCreatesAccountAndReturnsOnboardingUrlWhenNoStripeAccountExists(): void
    {
        $joker   = $this->buildUser(1);
        $profile = $this->buildMentorProfile($joker); // pas de stripeAccountId

        $connectService = $this->createMock(StripeConnectService::class);
        $connectService->expects($this->once())
            ->method('createConnectedAccount')
            ->with($joker)
            ->willReturn('acct_persona5joker');

        $connectService->expects($this->once())
            ->method('generateAccountLink')
            ->with('acct_persona5joker')
            ->willReturn('https://connect.stripe.com/onboard/acct_persona5joker');

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('findOneBy')->with(['user' => $joker])->willReturn($profile);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $response = $this->makeController($joker, $connectService, $repo, $em)->onboard();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('https://connect.stripe.com/onboard/acct_persona5joker', $payload['onboarding_url']);
    }

    public function testOnboardSkipsAccountCreationAndReturnsUrlWhenStripeAccountAlreadyExists(): void
    {
        $joker   = $this->buildUser(1);
        $profile = $this->buildMentorProfile($joker, 'acct_existing_palace'); // compte déjà créé

        $connectService = $this->createMock(StripeConnectService::class);
        $connectService->expects($this->never())->method('createConnectedAccount');

        $connectService->expects($this->once())
            ->method('generateAccountLink')
            ->with('acct_existing_palace')
            ->willReturn('https://connect.stripe.com/onboard/refresh');

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('findOneBy')->willReturn($profile);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->never())->method('flush');

        $response = $this->makeController($joker, $connectService, $repo, $em)->onboard();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('onboarding_url', $payload);
    }

    public function testOnboardSavesNewStripeAccountIdOnProfile(): void
    {
        $joker   = $this->buildUser(1);
        $profile = $this->buildMentorProfile($joker); // stripeAccountId null

        $connectService = $this->createMock(StripeConnectService::class);
        $connectService->method('createConnectedAccount')->willReturn('acct_new_joker');
        $connectService->method('generateAccountLink')->willReturn('https://connect.stripe.com/x');

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('findOneBy')->willReturn($profile);

        $this->makeController($joker, $connectService, $repo)->onboard();

        $this->assertSame('acct_new_joker', $profile->getStripeAccountId());
    }

    // ======================================================================
    //  onboard() — cas d'erreur
    // ======================================================================

    public function testOnboardReturns403WhenUserHasNoMentorProfile(): void
    {
        $morgana = $this->buildUser(2, 'MorganaThief');

        $connectService = $this->createMock(StripeConnectService::class);
        $connectService->expects($this->never())->method('createConnectedAccount');

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('findOneBy')->willReturn(null); // pas de profil mentor

        $response = $this->makeController($morgana, $connectService, $repo)->onboard();

        $this->assertSame(403, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    // ======================================================================
    //  status() — cas nominal
    // ======================================================================

    public function testStatusReturnsFalseAndOnboardingRequiredWhenNoStripeAccount(): void
    {
        $joker   = $this->buildUser(1);
        $profile = $this->buildMentorProfile($joker); // pas de stripeAccountId

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('findOneBy')->willReturn($profile);

        $response = $this->makeController($joker, null, $repo)->status();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertNull($payload['stripe_account_id']);
        $this->assertFalse($payload['transfers_enabled']);
        $this->assertTrue($payload['onboarding_required']);
    }

    public function testStatusReturnsTrueWhenTransfersAreEnabled(): void
    {
        $joker   = $this->buildUser(1);
        $profile = $this->buildMentorProfile($joker, 'acct_joker_complete', true);

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('findOneBy')->willReturn($profile);

        $response = $this->makeController($joker, null, $repo)->status();

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('acct_joker_complete', $payload['stripe_account_id']);
        $this->assertTrue($payload['transfers_enabled']);
        $this->assertFalse($payload['onboarding_required']);
    }

    public function testStatusReturnsOnboardingRequiredWhenAccountExistsButTransfersNotEnabled(): void
    {
        $joker   = $this->buildUser(1);
        // compte créé mais KYC non terminé
        $profile = $this->buildMentorProfile($joker, 'acct_pending_kyc', false);

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('findOneBy')->willReturn($profile);

        $response = $this->makeController($joker, null, $repo)->status();

        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('acct_pending_kyc', $payload['stripe_account_id']);
        $this->assertFalse($payload['transfers_enabled']);
        $this->assertTrue($payload['onboarding_required']);
    }

    // ======================================================================
    //  status() — cas d'erreur
    // ======================================================================

    public function testStatusReturns403WhenUserHasNoMentorProfile(): void
    {
        $morgana = $this->buildUser(2, 'MorganaThief');

        $repo = $this->createMock(MentorProfileRepository::class);
        $repo->method('findOneBy')->willReturn(null);

        $response = $this->makeController($morgana, null, $repo)->status();

        $this->assertSame(403, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }
}
