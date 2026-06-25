<?php

namespace App\Tests\Service;

use App\Entity\User;
use App\Service\UserBanNotificationService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

class UserBanNotificationServiceTest extends TestCase
{
    private $mailerMock;
    private UserBanNotificationService $service;

    protected function setUp(): void
    {
        $this->mailerMock = $this->createMock(MailerInterface::class);
        $this->service = new UserBanNotificationService($this->mailerMock);
    }

    public function testSendBanEmailWithReason(): void
    {
        $user = new User();
        $user->setEmail('test@example.com');
        $user->setUsername('testuser');

        $this->mailerMock->expects($this->once())
            ->method('send')
            ->with($this->callback(function (Email $email) {
                $html = $email->getHtmlBody();
                return $email->getTo()[0]->getAddress() === 'test@example.com' &&
                       $email->getSubject() === 'Votre accès à World of Code a été suspendu' &&
                       str_contains($html, 'testuser') &&
                       str_contains($html, 'Bad behavior');
            }));

        $this->service->sendBanEmail($user, 'Bad behavior');
    }

    public function testSendBanEmailWithoutReason(): void
    {
        $user = new User();
        $user->setEmail('test@example.com');
        $user->setUsername('testuser');

        $this->mailerMock->expects($this->once())
            ->method('send')
            ->with($this->callback(function (Email $email) {
                $html = $email->getHtmlBody();
                return $email->getTo()[0]->getAddress() === 'test@example.com' &&
                       !str_contains($html, 'Raison communiquée par');
            }));

        $this->service->sendBanEmail($user, null);
    }

    public function testSendBanEmailCatchesException(): void
    {
        $user = new User();
        $user->setEmail('test@example.com');
        $user->setUsername('testuser');

        $this->mailerMock->expects($this->once())
            ->method('send')
            ->willThrowException(new TransportException('Mail server down'));

        // Should not throw an exception
        $this->service->sendBanEmail($user, 'Bad behavior');
    }

    public function testSendUnbanEmail(): void
    {
        $user = new User();
        $user->setEmail('test@example.com');
        $user->setUsername('testuser');

        $this->mailerMock->expects($this->once())
            ->method('send')
            ->with($this->callback(function (Email $email) {
                $html = $email->getHtmlBody();
                return $email->getTo()[0]->getAddress() === 'test@example.com' &&
                       $email->getSubject() === 'Votre accès à World of Code a été rétabli' &&
                       str_contains($html, 'testuser') &&
                       str_contains($html, 'Votre suspension a été levée');
            }));

        $this->service->sendUnbanEmail($user);
    }

    public function testSendUnbanEmailCatchesException(): void
    {
        $user = new User();
        $user->setEmail('test@example.com');
        $user->setUsername('testuser');

        $this->mailerMock->expects($this->once())
            ->method('send')
            ->willThrowException(new TransportException('Mail server down'));

        // Should not throw an exception
        $this->service->sendUnbanEmail($user);
    }
}
