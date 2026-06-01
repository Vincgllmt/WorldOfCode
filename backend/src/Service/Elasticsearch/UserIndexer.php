<?php

namespace App\Service\Elasticsearch;

use App\Entity\User;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

class UserIndexer
{
    private const INDEX = IndexDefinitions::USERS_INDEX;

    private LoggerInterface $logger;

    public function __construct(
        private readonly ElasticClient $elasticClient,
        ?LoggerInterface $logger = null,
    ) {
        $this->logger = $logger ?? new NullLogger();
    }

    public function createIndexIfNotExists(): bool
    {
        if ($this->elasticClient->indexExists(self::INDEX)) {
            return false;
        }
        $this->elasticClient->createIndex(self::INDEX, IndexDefinitions::usersMapping());
        return true;
    }

    public function index(User $user): void
    {
        if ($user->getId() === null) {
            return;
        }

        try {
            $this->elasticClient->indexDocument(self::INDEX, (string) $user->getId(), $this->toDocument($user));
        } catch (\Throwable $e) {
            $this->logger->warning("Échec d'indexation Elasticsearch pour l'utilisateur.", [
                'userId' => $user->getId(),
                'error'  => $e->getMessage(),
            ]);
        }
    }

    public function delete(int $userId): void
    {
        try {
            $this->elasticClient->deleteDocument(self::INDEX, (string) $userId);
        } catch (\Throwable $e) {
            $this->logger->warning('Échec de suppression Elasticsearch pour l\'utilisateur.', [
                'userId' => $userId,
                'error'  => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param iterable<User> $users
     */
    public function bulkIndex(iterable $users): int
    {
        $body = [];
        $count = 0;
        foreach ($users as $user) {
            if ($user->getId() === null) {
                continue;
            }
            $body[] = ['index' => ['_index' => self::INDEX, '_id' => (string) $user->getId()]];
            $body[] = $this->toDocument($user);
            $count++;
        }
        if ($count === 0) {
            return 0;
        }
        $this->elasticClient->bulk($body);
        return $count;
    }

    /**
     * @return array<string, mixed>
     */
    private function toDocument(User $user): array
    {
        $skills = [];
        foreach ($user->getSkills() as $skill) {
            $name = $skill->getName();
            if ($name !== '') {
                $skills[] = $name;
            }
        }

        return [
            'username'     => $user->getUsername(),
            'firstname'    => $user->getFirstname(),
            'lastname'     => $user->getLastname(),
            'bio'          => $user->getBio() ?? '',
            'location'     => $user->getLocation(),
            'availability' => $user->getAvailability()?->value,
            'avatarUrl'    => $user->getAvatarUrl(),
            'skills'       => $skills,
        ];
    }
}
