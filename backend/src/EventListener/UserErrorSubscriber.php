<?php

namespace App\EventListener;

use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

#[AsEventListener(event: KernelEvents::EXCEPTION, priority: 0)]
class UserErrorSubscriber
{
    public function __construct(
        #[Autowire(service: 'monolog.logger.user_error')]
        private LoggerInterface $logger,
        private TokenStorageInterface $tokenStorage,
    ) {}

    public function __invoke(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();

        if (!$exception instanceof HttpExceptionInterface) {
            return;
        }

        $statusCode = $exception->getStatusCode();

        // 4xx uniquement, sauf 404 (trop de bruit bots/crawlers)
        if ($statusCode < 400 || $statusCode >= 500 || $statusCode === 404) {
            return;
        }

        $request = $event->getRequest();
        $token = $this->tokenStorage->getToken();

        $this->logger->warning($exception->getMessage(), [
            'status_code' => $statusCode,
            'route'       => $request->attributes->get('_route', 'unknown'),
            'method'      => $request->getMethod(),
            'ip'          => $request->getClientIp(),
            'user'        => $token?->getUser()?->getUserIdentifier() ?? 'anonymous',
        ]);
    }
}
