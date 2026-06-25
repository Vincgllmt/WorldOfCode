<?php

namespace App\Service;

use App\Entity\Notification;
use App\Entity\User;
use App\Enum\NotificationType;
use App\Repository\NotificationRepository;
use App\Mapper\NotificationMapper;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class NotificationService
{
    public function __construct(
        private NotificationRepository $repo,
        private NotificationMapper $mapper,
        private HttpClientInterface $httpClient,
        private string $messagerieUrl,
        private string $internalSecret
    ) {}

    public function createAndPush(
        User $recipient,
        User $sender,
        NotificationType $type,
        string $message,
        ?int $relatedEntityId = null
    ): void {
        // Ne pas se notifier soi-même
        if ($recipient->getId() === $sender->getId()) {
            return;
        }

        $notification = new Notification();
        $notification->setRecipient($recipient);
        $notification->setSender($sender);
        $notification->setType($type);
        $notification->setMessage($message);
        $notification->setRelatedEntityId($relatedEntityId);

        $this->repo->save($notification);

        // Push temps réel via la messagerie
        $dto = $this->mapper->toDto($notification);

        try {
            $this->httpClient->request('POST', $this->messagerieUrl . '/api/notify', [
                // SEC-14 : secret partagé pour authentifier l'appel interne backend → messagerie
                'headers' => ['X-Internal-Secret' => $this->internalSecret],
                'json' => [
                    'recipientId' => $recipient->getId(),
                    'notification' => (array) $dto,
                ],
                'timeout' => 2,
            ]);
        } catch (\Throwable $e) {
            // Ne pas bloquer la requête principale si le push échoue
            // La notification est déjà en BDD
        }
    }
}
