<?php

namespace App\EventListener;

use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTAuthenticatedEvent;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Bloque les tokens JWT temporaires (2FA pending) sur les routes protégées.
 * Seul l'endpoint /api/2fa/verify accepte ces tokens manuellement.
 */
class TwoFactorJWTListener
{
    public function onJWTAuthenticated(JWTAuthenticatedEvent $event): void
    {
        $payload = $event->getPayload();

        if (!empty($payload['2fa_pending'])) {
            throw new AccessDeniedHttpException('2FA verification required');
        }
    }
}
