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
        private LoggerInterface $userErrorLogger,
        #[Autowire(service: 'monolog.logger.server_error')]
        private LoggerInterface $serverErrorLogger,
        private TokenStorageInterface $tokenStorage,
    ) {}

    public function __invoke(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();
        $request   = $event->getRequest();
        $token     = $this->tokenStorage->getToken();

        $context = [
            'route'  => $request->attributes->get('_route', 'unknown'),
            'method' => $request->getMethod(),
            'ip'     => $request->getClientIp(),
            'user'   => $token?->getUser()?->getUserIdentifier() ?? 'anonymous',
        ];

        if ($exception instanceof HttpExceptionInterface) {
            $statusCode = $exception->getStatusCode();

            if ($statusCode >= 500) {
                $this->serverErrorLogger->critical($exception->getMessage(), array_merge($context, [
                    'status_code'     => $statusCode,
                    'exception_class' => $exception::class,
                ]));
            } elseif ($statusCode >= 400 && $statusCode !== 404) {
                $this->userErrorLogger->warning($exception->getMessage(), array_merge($context, [
                    'status_code' => $statusCode,
                ]));
            }
        } else {
            // Exception non-HTTP → rendue en 500 par Symfony
            $this->serverErrorLogger->critical($exception->getMessage(), array_merge($context, [
                'status_code'     => 500,
                'exception_class' => $exception::class,
                'file'            => $exception->getFile(),
                'line'            => $exception->getLine(),
            ]));
        }
    }
}
