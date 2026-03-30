<?php

namespace App\Tests\Service;

use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\UserRepository;
use App\Service\TwoFactorService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Mailer\MailerInterface;

/**
 * 🎮 Deus Ex - Tests unitaires du TwoFactorService
 *
 * JCDenton   = utilisateur standard qui reçoit et vérifie les codes 2FA
 * AdamJensen = utilisateur admin en mode dev (code fixe 847291)
 */
class TwoFactorServiceTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(
        string $username = 'JCDenton',
        UserRole $role = UserRole::ROLE_USER,
    ): User {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@unatco.gov')
            ->setFirstname($username)
            ->setLastname('Agent')
            ->setPassword('hashed')
            ->setRole($role);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, 1);
        $user->onCreate();

        return $user;
    }

    private function makeService(
        ?UserRepository $repo = null,
        ?MailerInterface $mailer = null,
    ): TwoFactorService {
        return new TwoFactorService(
            $mailer ?? $this->createMock(MailerInterface::class),
            $repo   ?? $this->createMock(UserRepository::class),
        );
    }

    // ======================================================================
    //  generateAndSend()
    // ======================================================================

    public function testGenerateAndSendStoresHashedCodeOnUser(): void
    {
        $jc = $this->buildUser();

        $repo = $this->createMock(UserRepository::class);
        $repo->expects($this->once())->method('save')->with($jc);

        $this->makeService($repo)->generateAndSend($jc);

        $this->assertNotNull($jc->getTwoFactorCode());
        $this->assertNotNull($jc->getTwoFactorExpiresAt());
    }

    public function testGenerateAndSendSendsEmail(): void
    {
        $jc = $this->buildUser();

        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects($this->once())->method('send');

        $this->makeService(null, $mailer)->generateAndSend($jc);
    }

    public function testGenerateAndSendInDevModeUsesFixedCodeForAdmin(): void
    {
        $adam = $this->buildUser('AdamJensen', UserRole::ROLE_ADMIN);

        $_ENV['APP_ENV'] = 'dev';
        $service = $this->makeService();
        $service->generateAndSend($adam);
        unset($_ENV['APP_ENV']);

        $storedHash = $adam->getTwoFactorCode();
        $this->assertNotNull($storedHash);
        $this->assertTrue(password_verify('847291', $storedHash));
    }

    public function testGenerateAndSendInDevModeUsesRandomCodeForRegularUser(): void
    {
        $jc = $this->buildUser('JCDenton', UserRole::ROLE_USER);

        $_ENV['APP_ENV'] = 'dev';
        $service = $this->makeService();
        $service->generateAndSend($jc);
        unset($_ENV['APP_ENV']);

        $storedHash = $jc->getTwoFactorCode();
        $this->assertNotNull($storedHash);
        // Le code fixe 847291 ne doit PAS être utilisé pour un utilisateur standard
        $this->assertFalse(password_verify('847291', $storedHash));
    }

    public function testGenerateAndSendSetsExpiryInFuture(): void
    {
        $jc = $this->buildUser();
        $this->makeService()->generateAndSend($jc);

        $expiresAt = $jc->getTwoFactorExpiresAt();
        $this->assertNotNull($expiresAt);
        $this->assertGreaterThan(new \DateTimeImmutable(), $expiresAt);
    }

    // ======================================================================
    //  verifyCode()
    // ======================================================================

    public function testVerifyCodeWithValidCodeReturnsTrue(): void
    {
        $jc = $this->buildUser();
        $code = '123456';
        $jc->setTwoFactorCode(password_hash($code, PASSWORD_BCRYPT));
        $jc->setTwoFactorExpiresAt(new \DateTimeImmutable('+10 minutes'));

        $repo = $this->createMock(UserRepository::class);
        $repo->expects($this->once())->method('save');

        $result = $this->makeService($repo)->verifyCode($jc, $code);

        $this->assertTrue($result);
    }

    public function testVerifyCodeClearsTwoFactorDataOnSuccess(): void
    {
        $jc = $this->buildUser();
        $code = '654321';
        $jc->setTwoFactorCode(password_hash($code, PASSWORD_BCRYPT));
        $jc->setTwoFactorExpiresAt(new \DateTimeImmutable('+10 minutes'));

        $this->makeService()->verifyCode($jc, $code);

        $this->assertNull($jc->getTwoFactorCode());
        $this->assertNull($jc->getTwoFactorExpiresAt());
    }

    public function testVerifyCodeWithWrongCodeReturnsFalse(): void
    {
        $jc = $this->buildUser();
        $jc->setTwoFactorCode(password_hash('123456', PASSWORD_BCRYPT));
        $jc->setTwoFactorExpiresAt(new \DateTimeImmutable('+10 minutes'));

        $result = $this->makeService()->verifyCode($jc, '000000');

        $this->assertFalse($result);
    }

    public function testVerifyCodeWithExpiredCodeReturnsFalse(): void
    {
        $jc = $this->buildUser();
        $code = '999888';
        $jc->setTwoFactorCode(password_hash($code, PASSWORD_BCRYPT));
        $jc->setTwoFactorExpiresAt(new \DateTimeImmutable('-1 minute'));

        $repo = $this->createMock(UserRepository::class);
        $repo->expects($this->once())->method('save');

        $result = $this->makeService($repo)->verifyCode($jc, $code);

        $this->assertFalse($result);
    }

    public function testVerifyCodeClearsTwoFactorDataWhenExpired(): void
    {
        $jc = $this->buildUser();
        $code = '112233';
        $jc->setTwoFactorCode(password_hash($code, PASSWORD_BCRYPT));
        $jc->setTwoFactorExpiresAt(new \DateTimeImmutable('-1 minute'));

        $this->makeService()->verifyCode($jc, $code);

        $this->assertNull($jc->getTwoFactorCode());
        $this->assertNull($jc->getTwoFactorExpiresAt());
    }

    public function testVerifyCodeWithNoStoredHashReturnsFalse(): void
    {
        $jc = $this->buildUser();
        // Pas de code stocké

        $result = $this->makeService()->verifyCode($jc, '123456');

        $this->assertFalse($result);
    }

    public function testVerifyCodeWithNullExpiresAtReturnsFalse(): void
    {
        $jc = $this->buildUser();
        $jc->setTwoFactorCode(password_hash('123456', PASSWORD_BCRYPT));
        // Pas de date d'expiration

        $result = $this->makeService()->verifyCode($jc, '123456');

        $this->assertFalse($result);
    }
}
