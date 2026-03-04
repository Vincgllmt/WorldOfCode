<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mime\Email;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class PasswordResetService
{
    private Mailer $mailer;
    private UserRepository $userRepository;
    private string $frontendUrl;

    public function __construct(
        UserRepository $userRepository,
        #[Autowire(env: 'APP_FRONTEND_URL')] string $frontendUrl
    ) {
        $this->frontendUrl = rtrim($frontendUrl, '/');
        $dsn = 'smtp://noreply.worldofcode@gmail.com:ayrwjiknectnokcf@smtp.gmail.com:587';
        $transport = Transport::fromDsn($dsn);
        $this->mailer = new Mailer($transport);
        $this->userRepository = $userRepository;
    }
    // public function requestReset(User $user): void
    // {
    //     $token = Uuid::v4()->toRfc4122();
    //     $user->setResetToken($token);
    //     $this->userRepository->save($user);

    //     $resetLink = sprintf('https://localhost:3000/reset-password?token=%s', $token);

    //     $email = (new Email())
    //         ->from('no-reply@yourapp.com')
    //         ->to($user->getEmail())
    //         ->subject('Réinitialisation de votre mot de passe')
    //         ->html(sprintf(
    //             '<p>Bonjour %s,</p><p>Cliquez sur ce lien pour réinitialiser votre mot de passe :</p><p><a href="%s">%s</a></p>',
    //             $user->getFirstname(),
    //             $resetLink,
    //             $resetLink
    //         ));


    //     $this->mailer->send($email);
    // }
    public function requestReset(User $user): void
    {
        $token = Uuid::v4()->toRfc4122();
        $user->setResetToken($token);
        $this->userRepository->save($user);

        $resetLink = sprintf('%s/reset-password?token=%s', $this->frontendUrl, $token);

        $htmlContent = sprintf('
        <div style="font-family: Arial, sans-serif; background-color: #f5f7fa; padding: 30px; text-align: center;">
            <div style="max-width: 600px; background: white; margin: auto; border-radius: 8px; padding: 30px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #2d3748;">Réinitialisation de votre mot de passe</h2>
                <p style="color: #4a5568;">Bonjour <strong>%s</strong>,</p>
                <p style="color: #4a5568;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour le réinitialiser :</p>
                
                <a href="%s" style="display: inline-block; margin-top: 20px; background-color: #3182ce; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
                    Réinitialiser mon mot de passe
                </a>
                
                <p style="color: #718096; margin-top: 30px; font-size: 0.9em;">
                    Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.
                </p>
            </div>
            <p style="color: #a0aec0; font-size: 0.8em; margin-top: 15px;">
                &copy; %d World of Code – Tous droits réservés.
            </p>
        </div>
    ', $user->getFirstname(), $resetLink, date('Y'));

        $email = (new Email())
            ->from('no-reply@worldofcode.com')
            ->to($user->getEmail())
            ->subject('🔐 World of Code - Réinitialisation de votre mot de passe')
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
