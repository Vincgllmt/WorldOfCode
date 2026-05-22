<?php

namespace App\Service\Elasticsearch;

use App\Entity\TechGroup;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

class GroupIndexer
{
    private const INDEX = IndexDefinitions::GROUPS_INDEX;

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
        $this->elasticClient->createIndex(self::INDEX, IndexDefinitions::groupsMapping());
        return true;
    }

    public function index(TechGroup $group): void
    {
        try {
            $this->elasticClient->indexDocument(self::INDEX, (string) $group->getId(), $this->toDocument($group));
        } catch (\Throwable $e) {
            $this->logger->warning("Échec d'indexation Elasticsearch pour le groupe.", [
                'groupId' => $group->getId(),
                'error'   => $e->getMessage(),
            ]);
        }
    }

    public function delete(int $groupId): void
    {
        try {
            $this->elasticClient->deleteDocument(self::INDEX, (string) $groupId);
        } catch (\Throwable $e) {
            $this->logger->warning('Échec de suppression Elasticsearch pour le groupe.', [
                'groupId' => $groupId,
                'error'   => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param iterable<TechGroup> $groups
     */
    public function bulkIndex(iterable $groups): int
    {
        $body = [];
        $count = 0;
        foreach ($groups as $group) {
            $body[] = ['index' => ['_index' => self::INDEX, '_id' => (string) $group->getId()]];
            $body[] = $this->toDocument($group);
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
    private function toDocument(TechGroup $group): array
    {
        return [
            'name'        => $group->getName(),
            'description' => $group->getDescription() ?? '',
            'createdAt'   => $group->getCreatedAt()->format('c'),
        ];
    }
}
