<?php

namespace App\Service;

use App\Entity\LoginHistory;
use App\Entity\User;
use App\Repository\LoginHistoryRepository;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class LoginNotificationService
{
    public function __construct(
        private LoginHistoryRepository $loginHistoryRepository,
        private MailerInterface $mailer,
        private HttpClientInterface $httpClient,
        #[Autowire(env: 'IP_HASH_SALT')] private string $ipHashSalt
    ) {}

    /**
     * À appeler après chaque authentification réussie.
     * Enregistre le contexte de connexion et envoie un email si le pays est nouveau.
     */
    public function recordLogin(User $user, ?string $ip): void
    {
        if (!$ip) {
            return;
        }

        $ipHash = $this->hashIp($ip);
        $countryCode = $this->resolveCountry($ip);

        // Vérifier si c'est une nouvelle IP ou un nouveau pays
        $isNewIp = !$this->loginHistoryRepository->hasSeenIpHash($user, $ipHash);
        $isNewCountry = $countryCode !== null
            && !$this->loginHistoryRepository->hasSeenCountry($user, $countryCode);

        // Enregistrer dans l'historique
        $entry = (new LoginHistory())
            ->setUser($user)
            ->setIpHash($ipHash)
            ->setCountryCode($countryCode);

        $this->loginHistoryRepository->save($entry);

        // Envoyer une notification si le pays est inconnu
        // (on ne notifie pas pour une nouvelle IP dans le même pays déjà connu)
        if ($isNewCountry || ($isNewIp && $countryCode === null)) {
            $this->sendNotificationEmail($user, $countryCode);
        }
    }

    private function hashIp(string $ip): string
    {
        return hash('sha256', $this->ipHashSalt . $ip);
    }

    private function resolveCountry(string $ip): ?string
    {
        // Ignorer les IP privées / loopback
        if ($this->isPrivateIp($ip)) {
            return null;
        }

        try {
            $response = $this->httpClient->request('GET', "http://ip-api.com/json/{$ip}", [
                'timeout' => 2,
                'query' => ['fields' => 'countryCode,status'],
            ]);

            $data = $response->toArray(false);

            if (($data['status'] ?? '') === 'success' && isset($data['countryCode'])) {
                return strtoupper(substr($data['countryCode'], 0, 2));
            }
        } catch (\Throwable) {
            // ip-api.com indisponible → on continue sans pays
        }

        return null;
    }

    private function isPrivateIp(string $ip): bool
    {
        return filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === false;
    }

    private function sendNotificationEmail(User $user, ?string $countryCode): void
    {
        $location = $countryCode
            ? sprintf('depuis un nouveau pays (<strong>%s</strong>)', htmlspecialchars($countryCode))
            : 'depuis une nouvelle adresse inconnue';

        $date = (new \DateTimeImmutable())->format('d/m/Y à H:i') . ' UTC';

        $html = sprintf('
        <div style="font-family: \'Segoe UI\', Arial, sans-serif; background-color: #f0fdf4; padding: 40px 20px; text-align: center;">
            <div style="max-width: 500px; background: white; margin: auto; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 20px rgba(22, 163, 74, 0.1); border-top: 4px solid #dc2626;">

                <div style="margin-bottom: 24px;">
                    <span style="font-size: 24px; font-weight: 700; color: #16a34a; letter-spacing: -0.5px;">World</span><span style="font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.5px;">OfCode</span>
                </div>

                <h2 style="color: #dc2626; font-size: 20px; font-weight: 600; margin: 0 0 8px;">Nouvelle connexion détectée</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px;">
                    Bonjour <strong style="color: #111827;">%s</strong>, une connexion à votre compte a été détectée %s le <strong>%s</strong>.
                </p>

                <p style="color: #6b7280; font-size: 13px; margin: 0 0 20px;">
                    Si c\'est bien vous, ignorez ce message. Dans le cas contraire, changez immédiatement votre mot de passe.
                </p>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    Cet email a été envoyé automatiquement. Ne pas répondre.
                </p>
            </div>

            <p style="color: #9ca3af; font-size: 11px; margin-top: 20px;">
                &copy; %d World of Code
            </p>
        </div>
        ', $user->getFirstname(), $location, $date, date('Y'));

        $email = (new Email())
            ->from('no-reply@worldofcode.com')
            ->to($user->getEmail())
            ->subject('World of Code - Nouvelle connexion depuis un emplacement inconnu')
            ->html($html);

        $this->mailer->send($email);
    }
}
