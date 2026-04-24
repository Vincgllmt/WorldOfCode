<?php

namespace App\Tests\Service;

use App\Entity\TrustedDevice;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\TrustedDeviceRepository;
use App\Service\TrustedDeviceService;
use PHPUnit\Framework\TestCase;

/**
 * 🕵️ Hitman - Tests unitaires du TrustedDeviceService
 *
 * Agent47           = utilisateur principal (l'agent de confiance)
 * DianaWinterbottom = handler (supervise les opérations)
 */
class TrustedDeviceServiceTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id = 47, string $username = 'Agent47'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@ica.agency')
            ->setFirstname('Agent')
            ->setLastname('47')
            ->setPassword('B4rc0d3_47!')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function makeService(?TrustedDeviceRepository $repo = null): TrustedDeviceService
    {
        return new TrustedDeviceService(
            $repo ?? $this->createMock(TrustedDeviceRepository::class)
        );
    }

    // ======================================================================
    //  getCookieName() & getTrustDays()
    // ======================================================================

    public function testGetCookieNameReturnsExpectedValue(): void
    {
        $this->assertSame('trusted_device', TrustedDeviceService::getCookieName());
    }

    public function testGetTrustDaysReturnsNinetyDays(): void
    {
        $this->assertSame(90, $this->makeService()->getTrustDays());
    }

    // ======================================================================
    //  generateToken()
    // ======================================================================

    public function testGenerateTokenReturnsHexStringOf64Characters(): void
    {
        $user = $this->buildUser();
        $repo = $this->createMock(TrustedDeviceRepository::class);

        $rawToken = $this->makeService($repo)->generateToken($user, 'Mozilla/5.0');

        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $rawToken);
    }

    public function testGenerateTokenSavesDeviceWithCorrectHash(): void
    {
        $user        = $this->buildUser();
        $savedDevice = null;

        $repo = $this->createMock(TrustedDeviceRepository::class);
        $repo->method('save')->willReturnCallback(
            function (TrustedDevice $device) use (&$savedDevice): void {
                $savedDevice = $device;
            }
        );

        $rawToken = $this->makeService($repo)->generateToken($user, 'Mozilla/5.0');

        $this->assertNotNull($savedDevice);
        $this->assertSame(hash('sha256', $rawToken), $savedDevice->getTokenHash());
        $this->assertSame('Mozilla/5.0', $savedDevice->getUserAgent());
    }

    public function testGenerateTokenCleansExpiredDevicesBeforeSaving(): void
    {
        $user = $this->buildUser();
        $repo = $this->createMock(TrustedDeviceRepository::class);
        $repo->expects($this->once())->method('deleteExpiredForUser')->with($user);

        $this->makeService($repo)->generateToken($user, null);
    }

    public function testGenerateTokenTruncatesUserAgentOver255Characters(): void
    {
        $user        = $this->buildUser();
        $longAgent   = str_repeat('A', 300);
        $savedDevice = null;

        $repo = $this->createMock(TrustedDeviceRepository::class);
        $repo->method('save')->willReturnCallback(
            function (TrustedDevice $device) use (&$savedDevice): void {
                $savedDevice = $device;
            }
        );

        $this->makeService($repo)->generateToken($user, $longAgent);

        $this->assertNotNull($savedDevice);
        $this->assertSame(255, mb_strlen($savedDevice->getUserAgent() ?? ''));
    }

    public function testGenerateTokenHandlesNullUserAgent(): void
    {
        $user        = $this->buildUser();
        $savedDevice = null;

        $repo = $this->createMock(TrustedDeviceRepository::class);
        $repo->method('save')->willReturnCallback(
            function (TrustedDevice $device) use (&$savedDevice): void {
                $savedDevice = $device;
            }
        );

        $this->makeService($repo)->generateToken($user, null);

        $this->assertNotNull($savedDevice);
        $this->assertNull($savedDevice->getUserAgent());
    }

    // ======================================================================
    //  isDeviceTrusted()
    // ======================================================================

    public function testIsDeviceTrustedReturnsTrueWhenDeviceFound(): void
    {
        $user   = $this->buildUser();
        $device = $this->createMock(TrustedDevice::class);

        $repo = $this->createMock(TrustedDeviceRepository::class);
        $repo->method('findValidByUserAndHash')->willReturn($device);

        $this->assertTrue($this->makeService($repo)->isDeviceTrusted($user, 'any-raw-token'));
    }

    public function testIsDeviceTrustedReturnsFalseWhenDeviceNotFound(): void
    {
        $user = $this->buildUser();

        $repo = $this->createMock(TrustedDeviceRepository::class);
        $repo->method('findValidByUserAndHash')->willReturn(null);

        $this->assertFalse($this->makeService($repo)->isDeviceTrusted($user, 'unknown-token'));
    }

    public function testIsDeviceTrustedUsesHashOfRawToken(): void
    {
        $user     = $this->buildUser();
        $rawToken = 'my-raw-device-token';

        $repo = $this->createMock(TrustedDeviceRepository::class);
        $repo->expects($this->once())
            ->method('findValidByUserAndHash')
            ->with($user, hash('sha256', $rawToken))
            ->willReturn(null);

        $this->makeService($repo)->isDeviceTrusted($user, $rawToken);
    }
}
