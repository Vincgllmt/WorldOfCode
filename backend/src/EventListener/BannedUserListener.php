<?php

namespace App\EventListener;

use App\Entity\User;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

#[AsEventListener(event: KernelEvents::REQUEST, priority: 10)]
class BannedUserListener
{
    public function __construct(private TokenStorageInterface $tokenStorage) {}

    public function __invoke(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $token = $this->tokenStorage->getToken();
        if ($token === null) {
            return;
        }

        $user = $token->getUser();
        if (!$user instanceof User || !$user->isBanned()) {
            return;
        }

        // Les routes d'administration restent accessibles (gestion des bans)
        $path = $event->getRequest()->getPathInfo();
        if (str_starts_with($path, '/api/admin/')) {
            return;
        }

        $event->setResponse(new JsonResponse([
            'error' => 'Votre compte a été suspendu. Contactez la modération à moderation@worldofcode.com.',
            'code'  => 'ACCOUNT_BANNED',
        ], 403));
    }
}
