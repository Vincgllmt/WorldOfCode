<?php

namespace App\EventListener;

use Lexik\Bundle\JWTAuthenticationBundle\Event\AuthenticationFailureEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Events;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;

// Covers: bad credentials (AUTHENTICATION_FAILURE), invalid token (JWT_INVALID),
// expired token (JWT_EXPIRED), and missing token on protected routes (JWT_NOT_FOUND).
// These bypass kernel.exception so UserErrorSubscriber cannot catch them.
#[AsEventListener(event: Events::AUTHENTICATION_FAILURE, priority: 0)]
#[AsEventListener(event: Events::JWT_INVALID, priority: 0)]
#[AsEventListener(event: Events::JWT_EXPIRED, priority: 0)]
#[AsEventListener(event: Events::JWT_NOT_FOUND, priority: 0)]
class JwtAuthFailureListener
{
    public function __construct(
        #[Autowire(service: 'monolog.logger.user_error')]
        private LoggerInterface $logger,
    ) {}

    public function __invoke(AuthenticationFailureEvent $event): void
    {
        $request = $event->getRequest();

        $this->logger->warning('JWT authentication failure', [
            'status_code' => 401,
            'route'       => $request?->attributes->get('_route', 'unknown') ?? 'unknown',
            'method'      => $request?->getMethod() ?? 'unknown',
            'ip'          => $request?->getClientIp() ?? 'unknown',
            'user'        => 'anonymous',
            'reason'      => $event->getException()->getMessageKey(),
        ]);
    }
}
