<?php

namespace App\EventListener;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * SEC-19 : ajoute les en-têtes de sécurité sur toutes les réponses de l'API.
 * Pas de CSP restrictive (default-src) ici pour ne pas casser la doc OpenAPI (/doc) ;
 * on se limite à frame-ancestors 'none' (anti-clickjacking).
 */
#[AsEventListener(event: KernelEvents::RESPONSE)]
class SecurityHeadersSubscriber
{
    public function __invoke(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $headers = $event->getResponse()->headers;

        $headers->set('X-Content-Type-Options', 'nosniff');
        $headers->set('X-Frame-Options', 'DENY');
        $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $headers->set('Content-Security-Policy', "frame-ancestors 'none'");

        // HSTS seulement en HTTPS (évite de l'imposer en dev http local).
        if ($event->getRequest()->isSecure()) {
            $headers->set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
        }
    }
}
