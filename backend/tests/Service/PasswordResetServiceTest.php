<?php

namespace App\Tests\Service;

use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\TrustedDeviceRepository;
use App\Repository\UserRepository;
use App\Service\PasswordResetService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * 🎮 Final Fantasy VII - Tests unitaires du PasswordResetService
 *
 * CloudStrife       = utilisateur principal qui réinitialise son mot de passe
 * AerithGainsborough = utilisateur introuvable (token invalide)
 */
class PasswordResetServiceTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(string $username = 'CloudStrife'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@midgar.ff7')
            ->setFirstname($username)
            ->setLastname('Strife')
            ->setPassword('hashed')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, 1);
        $user->onCreate();

        return $user;
    }

    private function makeService(
        ?UserRepository $repo = null,
        ?MailerInterface $mailer = null,
        ?TrustedDeviceRepository $trustedDeviceRepo = null,
    ): PasswordResetService {
        return new PasswordResetService(
            $mailer          ?? $this->createMock(MailerInterface::class),
            $repo            ?? $this->createMock(UserRepository::class),
            $trustedDeviceRepo ?? $this->createMock(TrustedDeviceRepository::class),
            'http://worldofcode.test'
        );
    }

    // ======================================================================
    //  requestReset()
    // ======================================================================

    public function testRequestResetSavesTokenOnUser(): void
    {
        $cloud = $this->buildUser();

        $repo = $this->createMock(UserRepository::class);
        $repo->expects($this->once())->method('save')->with($cloud);

        $this->makeService($repo)->requestReset($cloud);

        $this->assertNotNull($cloud->getResetToken());
        // SEC-9 : une date d'expiration future est posée
        $this->assertNotNull($cloud->getResetTokenExpiresAt());
        $this->assertGreaterThan(new \DateTimeImmutable(), $cloud->getResetTokenExpiresAt());
    }

    public function testRequestResetSendsEmail(): void
    {
        $cloud = $this->buildUser();

        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects($this->once())->method('send');

        $this->makeService(null, $mailer)->requestReset($cloud);
    }

    public function testRequestResetGeneratesUniqueTokens(): void
    {
        $cloud1 = $this->buildUser('CloudStrife');
        $cloud2 = $this->buildUser('TifaLockhart');

        $service = $this->makeService();
        $service->requestReset($cloud1);
        $service->requestReset($cloud2);

        $this->assertNotSame($cloud1->getResetToken(), $cloud2->getResetToken());
    }

    // ======================================================================
    //  resetPassword()
    // ======================================================================

    public function testResetPasswordWithValidTokenReturnsTrueAndClearsToken(): void
    {
        $cloud = $this->buildUser();
        $cloud->setResetToken('valid-ff7-token');
        $cloud->setResetTokenExpiresAt(new \DateTimeImmutable('+1 hour'));

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->with(['resetToken' => 'valid-ff7-token'])->willReturn($cloud);
        $repo->expects($this->once())->method('save')->with($cloud);

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->method('hashPassword')->willReturn('new-hashed-password');

        $result = $this->makeService($repo)->resetPassword('valid-ff7-token', 'Buster$w0rd!2024', $hasher);

        $this->assertTrue($result);
        $this->assertNull($cloud->getResetToken());
        $this->assertNull($cloud->getResetTokenExpiresAt());
        $this->assertSame('new-hashed-password', $cloud->getPassword());
    }

    public function testResetPasswordWithExpiredTokenReturnsFalseAndClearsToken(): void
    {
        // SEC-9 : un token expiré est refusé et purgé, le mot de passe n'est pas changé.
        $cloud = $this->buildUser();
        $cloud->setResetToken('expired-ff7-token');
        $cloud->setResetTokenExpiresAt(new \DateTimeImmutable('-1 minute'));
        $originalPassword = $cloud->getPassword();

        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->with(['resetToken' => 'expired-ff7-token'])->willReturn($cloud);
        $repo->expects($this->once())->method('save')->with($cloud);

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->expects($this->never())->method('hashPassword');

        $result = $this->makeService($repo)->resetPassword('expired-ff7-token', 'Buster$w0rd!2024', $hasher);

        $this->assertFalse($result);
        $this->assertNull($cloud->getResetToken());
        $this->assertNull($cloud->getResetTokenExpiresAt());
        $this->assertSame($originalPassword, $cloud->getPassword());
    }

    public function testResetPasswordWithInvalidTokenReturnsFalse(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->with(['resetToken' => 'invalid-token'])->willReturn(null);

        $hasher = $this->createMock(UserPasswordHasherInterface::class);

        $result = $this->makeService($repo)->resetPassword('invalid-token', 'Buster$w0rd!2024', $hasher);

        $this->assertFalse($result);
    }

    public function testResetPasswordDoesNotSaveWhenTokenInvalid(): void
    {
        $repo = $this->createMock(UserRepository::class);
        $repo->method('findOneBy')->willReturn(null);
        $repo->expects($this->never())->method('save');

        $hasher = $this->createMock(UserPasswordHasherInterface::class);

        $this->makeService($repo)->resetPassword('ghost-token', 'Buster$w0rd!2024', $hasher);
    }
}
