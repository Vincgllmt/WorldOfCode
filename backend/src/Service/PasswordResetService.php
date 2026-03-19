<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class PasswordResetService
{
    private string $frontendUrl;

    public function __construct(
        private MailerInterface $mailer,
        private UserRepository $userRepository,
        #[Autowire(env: 'RESET_PASSWORD_URL')] string $frontendUrl
    ) {
        $this->frontendUrl = rtrim($frontendUrl, '/');
    }

    public function requestReset(User $user): void
    {
        $token = Uuid::v4()->toRfc4122();
        $user->setResetToken($token);
        $this->userRepository->save($user);

        $resetLink = sprintf('%s/reset-password?token=%s', $this->frontendUrl, $token);

        $htmlContent = sprintf('
        <div style="font-family: \'Segoe UI\', Arial, sans-serif; background-color: #f0fdf4; padding: 40px 20px; text-align: center;">
            <div style="max-width: 500px; background: white; margin: auto; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 20px rgba(22, 163, 74, 0.1); border-top: 4px solid #16a34a;">

                <div style="margin-bottom: 24px;">
                    <span style="font-size: 24px; font-weight: 700; color: #16a34a; letter-spacing: -0.5px;">World</span><span style="font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">OfCode</span>
                </div>

                <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 8px;">Réinitialisation du mot de passe</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 28px;">Bonjour <strong style="color: #111827;">%s</strong>, cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe.</p>

                <a href="%s" style="display: inline-block; background-color: #16a34a; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                    Réinitialiser mon mot de passe
                </a>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 20px;" />

                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.
                </p>
            </div>

            <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">
                &copy; %d World of Code
            </p>
        </div>
    ', $user->getFirstname(), $resetLink, date('Y'));

        $email = (new Email())
            ->from('no-reply@worldofcode.com')
            ->to($user->getEmail())
            ->subject('World of Code - Réinitialisation de votre mot de passe')
            ->html($htmlContent);

        $this->mailer->send($email);
    }

    public function resetPassword(string $token, string $newPassword, UserPasswordHasherInterface $hasher): bool
    {
        $user = $this->userRepository->findOneBy(['resetToken' => $token]);

        if (!$user) {
            return false;
        }

        $user->setPassword($hasher->hashPassword($user, $newPassword));
        $user->setResetToken(null);
        $this->userRepository->save($user);

        return true;
    }
}
