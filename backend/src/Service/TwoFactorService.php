<?php

namespace App\Service;

use App\Entity\User;
use App\Enum\UserRole;
use App\Repository\UserRepository;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

class TwoFactorService
{
    public function __construct(
        private MailerInterface $mailer,
        private UserRepository $userRepository,
        private string $appEnv = 'prod',
    ) {
        $this->appEnv = $_ENV['APP_ENV'] ?? $_SERVER['APP_ENV'] ?? 'prod';
    }

    /**
     * Génère un code 6 chiffres, le hash, le stocke en BDD et l'envoie par email.
     * En dev, le compte admin utilise toujours le code 000000.
     */
    public function generateAndSend(User $user): void
    {
        // En dev, code fixe pour le compte admin → pas besoin de checker ses mails
        if ($this->appEnv === 'dev' && $user->getRole() === UserRole::ROLE_ADMIN) {
            $code = '847291';
        } else {
            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        }

        $hashedCode = password_hash($code, PASSWORD_BCRYPT);
        $expiresAt = new \DateTimeImmutable('+10 minutes');

        $user->setTwoFactorCode($hashedCode);
        $user->setTwoFactorExpiresAt($expiresAt);
        $this->userRepository->save($user);

        $htmlContent = sprintf('
        <div style="font-family: \'Segoe UI\', Arial, sans-serif; background-color: #f0fdf4; padding: 40px 20px; text-align: center;">
            <div style="max-width: 500px; background: white; margin: auto; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 20px rgba(22, 163, 74, 0.1); border-top: 4px solid #16a34a;">

                <div style="margin-bottom: 24px;">
                    <span style="font-size: 24px; font-weight: 700; color: #16a34a; letter-spacing: -0.5px;">World</span><span style="font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">OfCode</span>
                </div>

                <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 8px;">Vérification en deux étapes</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 28px;">Bonjour <strong style="color: #111827;">%s</strong>, utilisez le code ci-dessous pour vous connecter.</p>

                <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #16a34a; margin: 24px 0;">%s</p>

                <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0;">
                    Ce code expire dans <strong style="color: #6b7280;">10 minutes</strong>.
                </p>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 20px;" />

                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.
                </p>
            </div>

            <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">
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
