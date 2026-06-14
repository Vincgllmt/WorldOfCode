<?php

namespace App\Service;

use App\Entity\User;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

class UserBanNotificationService
{
    public function __construct(private MailerInterface $mailer) {}

    public function sendBanEmail(User $user, ?string $reason): void
    {
        $reasonHtml = $reason
            ? '<p>Raison communiquée par l\'équipe de modération : <strong>' . htmlspecialchars($reason) . '</strong></p>'
            : '';

        $email = (new Email())
            ->from('no-reply@worldofcode.com')
            ->to($user->getEmail())
            ->subject('Votre accès à World of Code a été suspendu')
            ->html(
                '<p>Bonjour <strong>' . htmlspecialchars($user->getUsername()) . '</strong>,</p>'
                . '<p>Votre compte a été suspendu suite à une décision de notre équipe de modération. '
                . 'Votre accès à la plateforme est temporairement restreint.</p>'
                . $reasonHtml
                . '<p>Si vous pensez qu\'il s\'agit d\'une erreur ou souhaitez contester cette décision, '
                . 'contactez-nous à <a href="mailto:moderation@worldofcode.com">moderation@worldofcode.com</a>.</p>'
                . '<p>L\'équipe World of Code</p>'
            );

        try {
            $this->mailer->send($email);
        } catch (\Throwable) {
            // Ne pas bloquer l'action si l'envoi échoue
        }
    }

    public function sendUnbanEmail(User $user): void
    {
        $email = (new Email())
            ->from('no-reply@worldofcode.com')
            ->to($user->getEmail())
            ->subject('Votre accès à World of Code a été rétabli')
            ->html(
                '<p>Bonjour <strong>' . htmlspecialchars($user->getUsername()) . '</strong>,</p>'
                . '<p>Votre suspension a été levée. Vous pouvez à nouveau accéder à la plateforme normalement.</p>'
                . '<p>L\'équipe World of Code</p>'
            );

        try {
            $this->mailer->send($email);
        } catch (\Throwable) {
            // Ne pas bloquer l'action si l'envoi échoue
        }
    }
}
