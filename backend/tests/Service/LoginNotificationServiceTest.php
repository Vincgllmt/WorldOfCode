<?php

namespace App\Tests\Service;

use App\Entity\TrustedDevice;
use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\LoginHistoryRepository;
use App\Service\LoginNotificationService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * 🔍 Watch Dogs - Tests unitaires du LoginNotificationService
 *
 * AidenPearce = utilisateur dont on surveille les connexions (le hacker)
 * ClaraLille  = utilisateur secondaire (BadBoy17)
 */
class LoginNotificationServiceTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function buildUser(int $id = 1, string $username = 'AidenPearce'): User
    {
        $user = new User();
        $user->setUsername($username)
            ->setEmail($username . '@ctOS.chicago')
            ->setFirstname('Aiden')
            ->setLastname('Pearce')
            ->setPassword('Wr3nchH4cker!')
            ->setRole(UserRole::ROLE_USER);

        $idProp = new \ReflectionProperty(User::class, 'id');
        $idProp->setValue($user, $id);
        $user->onCreate();

        return $user;
    }

    private function makeService(
        ?LoginHistoryRepository $repo = null,
        ?MailerInterface $mailer = null,
        ?HttpClientInterface $httpClient = null,
        string $salt = 'test-ip-salt',
    ): LoginNotificationService {
        return new LoginNotificationService(
            $repo       ?? $this->createMock(LoginHistoryRepository::class),
            $mailer     ?? $this->createMock(MailerInterface::class),
            $httpClient ?? $this->createMock(HttpClientInterface::class),
            $salt,
        );
    }

    private function makeHttpClientReturning(?string $countryCode): HttpClientInterface
    {
        $data = $countryCode
            ? ['status' => 'success', 'countryCode' => $countryCode]
            : ['status' => 'fail'];

        $response = $this->createMock(ResponseInterface::class);
        $response->method('toArray')->willReturn($data);

        $client = $this->createMock(HttpClientInterface::class);
        $client->method('request')->willReturn($response);

        return $client;
    }

    // ======================================================================
    //  recordLogin()
    // ======================================================================

    public function testRecordLoginDoesNothingWithNullIp(): void
    {
        $user = $this->buildUser();

        $repo = $this->createMock(LoginHistoryRepository::class);
        $repo->expects($this->never())->method('save');

        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects($this->never())->method('send');

        $this->makeService($repo, $mailer)->recordLogin($user, null);
    }

    public function testRecordLoginWithNewPrivateIpSendsEmailAsUnknownLocation(): void
    {
        $user = $this->buildUser();

        $repo = $this->createMock(LoginHistoryRepository::class);
        $repo->method('hasSeenIpHash')->willReturn(false); // IP jamais vue
        $repo->expects($this->once())->method('save');

        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects($this->once())->method('send'); // nouvelle IP + pas de pays → email

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->expects($this->never())->method('request'); // IP privée → pas d'appel HTTP

        $this->makeService($repo, $mailer, $httpClient)->recordLogin($user, '127.0.0.1');
    }

    public function testRecordLoginWithKnownPrivateIpDoesNotSendEmail(): void
    {
        $user = $this->buildUser();

        $repo = $this->createMock(LoginHistoryRepository::class);
        $repo->method('hasSeenIpHash')->willReturn(true); // IP déjà vue
        $repo->expects($this->once())->method('save');

        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects($this->never())->method('send');

        $this->makeService($repo, $mailer)->recordLogin($user, '127.0.0.1');
    }

    public function testRecordLoginWithNewPublicCountrySendsEmail(): void
    {
        $user = $this->buildUser();

        $repo = $this->createMock(LoginHistoryRepository::class);
        $repo->method('hasSeenIpHash')->willReturn(false);
        $repo->method('hasSeenCountry')->willReturn(false); // pays inconnu
        $repo->expects($this->once())->method('save');

        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects($this->once())->method('send');

        $this->makeService($repo, $mailer, $this->makeHttpClientReturning('US'))
            ->recordLogin($user, '8.8.8.8');
    }

    public function testRecordLoginWithKnownCountryDoesNotSendEmail(): void
    {
        $user = $this->buildUser();

        $repo = $this->createMock(LoginHistoryRepository::class);
        $repo->method('hasSeenIpHash')->willReturn(false);
        $repo->method('hasSeenCountry')->willReturn(true); // pays déjà connu
        $repo->expects($this->once())->method('save');

        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects($this->never())->method('send');

        $this->makeService($repo, $mailer, $this->makeHttpClientReturning('FR'))
            ->recordLogin($user, '1.2.3.4');
    }

    public function testRecordLoginWhenIpApiUnavailableSendsEmailForNewIp(): void
    {
        $user = $this->buildUser();

        $repo = $this->createMock(LoginHistoryRepository::class);
        $repo->method('hasSeenIpHash')->willReturn(false); // nouvelle IP
        $repo->expects($this->once())->method('save');

        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects($this->once())->method('send'); // nouvelle IP + pays null → email

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willThrowException(new \RuntimeException('timeout'));

        $this->makeService($repo, $mailer, $httpClient)->recordLogin($user, '8.8.8.8');
    }

    public function testRecordLoginWhenIpApiUnavailableAndIpAlreadySeenDoesNotSendEmail(): void
    {
        $user = $this->buildUser();

        $repo = $this->createMock(LoginHistoryRepository::class);
        $repo->method('hasSeenIpHash')->willReturn(true); // IP déjà connue
        $repo->expects($this->once())->method('save');

        $mailer = $this->createMock(MailerInterface::class);
        $mailer->expects($this->never())->method('send');

        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willThrowException(new \RuntimeException('timeout'));

        $this->makeService($repo, $mailer, $httpClient)->recordLogin($user, '8.8.8.8');
    }
}
