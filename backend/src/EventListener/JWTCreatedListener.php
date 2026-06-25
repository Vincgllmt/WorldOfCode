<?php

namespace App\EventListener;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;

/**
 * Injecte l'id utilisateur dans le payload JWT au moment de sa création.
 *
 * Indispensable pour SEC-13 : sans ce listener, le payload JWT par défaut
 * contient uniquement `username` et `roles`. Le service messagerie
 * (Node.js Socket.IO) doit pouvoir identifier l'utilisateur de façon
 * fiable sans faire confiance à des données envoyées par le client.
 */
class JWTCreatedListener
{
    public function onJWTCreated(JWTCreatedEvent $event): void
    {
        $user = $event->getUser();

        if (!$user instanceof User) {
            return;
        }

        $payload = $event->getData();
        $payload['userId'] = $user->getId();

        $event->setData($payload);
    }
}
