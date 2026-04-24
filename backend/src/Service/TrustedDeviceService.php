<?php

namespace App\Service;

use App\Entity\TrustedDevice;
use App\Entity\User;
use App\Repository\TrustedDeviceRepository;

class TrustedDeviceService
{
    private const COOKIE_NAME = 'trusted_device';
    private const TRUST_DAYS  = 90;

    public function __construct(
        private TrustedDeviceRepository $repository,
    ) {}

    public static function getCookieName(): string
    {
        return self::COOKIE_NAME;
    }

    /**
     * Génère un token aléatoire (256 bits), stocke son hash SHA-256 en BDD
     * et retourne le token brut à placer dans le cookie.
     */
    public function generateToken(User $user, ?string $userAgent): string
    {
        $rawToken = bin2hex(random_bytes(32)); // 64 chars hex = 256 bits
        $hash     = hash('sha256', $rawToken);

        // Nettoyage des entrées expirées au passage
        $this->repository->deleteExpiredForUser($user);

        $device = (new TrustedDevice())
            ->setUser($user)
            ->setTokenHash($hash)
            ->setExpiresAt(new \DateTimeImmutable(sprintf('+%d days', self::TRUST_DAYS)))
            ->setUserAgent($userAgent ? mb_substr($userAgent, 0, 255) : null);

        $this->repository->save($device);

        return $rawToken;
    }

    /**
     * Vérifie si le token brut du cookie correspond à un appareil de confiance valide.
     */
    public function isDeviceTrusted(User $user, string $rawToken): bool
    {
        $hash = hash('sha256', $rawToken);
        return $this->repository->findValidByUserAndHash($user, $hash) !== null;
    }

    public function getTrustDays(): int
    {
        return self::TRUST_DAYS;
    }
}
