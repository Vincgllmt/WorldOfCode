<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

class TwoFactorService
{
    public function __construct(
        private MailerInterface $mailer,
        private UserRepository $userRepository,
    ) {}

    /**
     * Génère un code 6 chiffres, le hash, le stocke en BDD et l'envoie par email.
     */
    public function generateAndSend(User $user): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $hashedCode = password_hash($code, PASSWORD_BCRYPT);
        $expiresAt = new \DateTimeImmutable('+10 minutes');

        $user->setTwoFactorCode($hashedCode);
        $user->setTwoFactorExpiresAt($expiresAt);
        $this->userRepository->save($user);

        $htmlContent = sprintf('
        <div style="font-family: Arial, sans-serif; background-color: #f5f7fa; padding: 30px; text-align: center;">
            <div style="max-width: 600px; background: white; margin: auto; border-radius: 8px; padding: 30px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #2d3748;">Code de vérification</h2>
                <p style="color: #4a5568;">Bonjour <strong>%s</strong>,</p>
                <p style="color: #4a5568;">Votre code de vérification est :</p>
                <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3182ce; margin: 20px 0;">%s</p>
                <p style="color: #718096; font-size: 0.9em;">Ce code expire dans 10 minutes.</p>
                <p style="color: #718096; font-size: 0.9em;">Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.</p>
            </div>
            <p style="color: #a0aec0; font-size: 0.8em; margin-top: 15px;">
                &copy; %d World of Code
            </p>
        </div>',
            htmlspecialchars($user->getFirstname()),
            $code,
            (int) date('Y')
        );

        $email = (new Email())
            ->from('no-reply@worldofcode.com')
            ->to($user->getEmail())
            ->subject('World of Code - Code de vérification')
            ->html($htmlContent);

        $this->mailer->send($email);
    }

    /**
     * Vérifie le code soumis contre le hash stocké en BDD.
     */
    public function verifyCode(User $user, string $submittedCode): bool
    {
        $storedHash = $user->getTwoFactorCode();
        $expiresAt = $user->getTwoFactorExpiresAt();

        if (!$storedHash || !$expiresAt) {
            return false;
        }

        if (new \DateTimeImmutable() > $expiresAt) {
            $this->clearTwoFactor($user);
            return false;
        }

        if (!password_verify($submittedCode, $storedHash)) {
            return false;
        }

        $this->clearTwoFactor($user);
        return true;
    }

    private function clearTwoFactor(User $user): void
    {
        $user->setTwoFactorCode(null);
        $user->setTwoFactorExpiresAt(null);
        $this->userRepository->save($user);
    }
}
